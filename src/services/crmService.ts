import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";

export const MAX_WEBHOOK_RESPONSE_BYTES = 64 * 1024;
const DEFAULT_WEBHOOK_DEADLINE_MS = 10_000;

function normalizeUrlHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized.startsWith("[") && normalized.endsWith("]")
    ? normalized.slice(1, -1)
    : normalized;
}

type ResolvedAddress = {
  address: string;
  family: number;
};

export type ResolvedWebhook = {
  url: URL;
  address: string;
  family: 4 | 6;
};

export interface WebhookDeliveryDependencies {
  resolve(
    hostname: string,
    signal: AbortSignal,
  ): Promise<ResolvedAddress[]>;
  sendPinned(
    destination: ResolvedWebhook,
    body: string,
    signal: AbortSignal,
    maxResponseBytes: number,
  ): Promise<{
    statusCode: number;
    bytesReceived: number;
    location?: string;
  }>;
}

export interface ExternalCrmWebhookRequest {
  workspaceId: string;
  actionType: "booking" | "sale" | "lead";
  payload: unknown;
  webhookUrl: string;
  deadlineMs?: number;
}

function parseIpv4(address: string): bigint | null {
  const octets = address.split(".");

  if (octets.length !== 4) return null;

  let value = 0n;

  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const numeric = Number(octet);
    if (numeric < 0 || numeric > 255) return null;
    value = (value << 8n) | BigInt(numeric);
  }

  return value;
}

function parseIpv6(address: string): bigint | null {
  const normalized = address.toLowerCase().split("%")[0];
  const doubleColon = normalized.indexOf("::");

  if (doubleColon !== -1 && doubleColon !== normalized.lastIndexOf("::")) {
    return null;
  }

  const [rawLeft, rawRight = ""] =
    doubleColon === -1
      ? [normalized, ""]
      : [normalized.slice(0, doubleColon), normalized.slice(doubleColon + 2)];
  const left = rawLeft ? rawLeft.split(":") : [];
  const right = rawRight ? rawRight.split(":") : [];

  const expandIpv4Tail = (parts: string[]) => {
    const last = parts[parts.length - 1];
    if (!last?.includes(".")) return true;
    const ipv4 = parseIpv4(last);
    if (ipv4 === null) return false;
    parts.splice(
      parts.length - 1,
      1,
      ((ipv4 >> 16n) & 0xffffn).toString(16),
      (ipv4 & 0xffffn).toString(16),
    );
    return true;
  };

  if (!expandIpv4Tail(left) || !expandIpv4Tail(right)) return null;

  const missing = 8 - left.length - right.length;

  if (
    missing < 0 ||
    (doubleColon === -1 && missing !== 0) ||
    (doubleColon !== -1 && missing < 1)
  ) {
    return null;
  }

  const groups = [...left, ...Array(missing).fill("0"), ...right];

  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }

  return groups.reduce(
    (value, group) => (value << 16n) | BigInt(`0x${group}`),
    0n,
  );
}

function inCidr(
  value: bigint,
  network: bigint,
  prefix: number,
  bits: number,
): boolean {
  const shift = BigInt(bits - prefix);
  return value >> shift === network >> shift;
}

const IPV4_DENY_CIDRS: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.31.196.0", 24],
  ["192.52.193.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["192.175.48.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

const IPV6_DENY_CIDRS: Array<[string, number]> = [
  ["2001::", 23],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
  ["5f00::", 16],
];

export function isGlobalUnicastIp(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  const family = isIP(normalized);

  if (family === 4) {
    const value = parseIpv4(normalized);
    if (value === null) return false;

    return !IPV4_DENY_CIDRS.some(([network, prefix]) => {
      const networkValue = parseIpv4(network);
      return networkValue !== null && inCidr(value, networkValue, prefix, 32);
    });
  }

  if (family !== 6) return false;

  const value = parseIpv6(normalized);
  const globalBase = parseIpv6("2000::");

  if (
    value === null ||
    globalBase === null ||
    !inCidr(value, globalBase, 3, 128)
  ) {
    return false;
  }

  return !IPV6_DENY_CIDRS.some(([network, prefix]) => {
    const networkValue = parseIpv6(network);
    return networkValue !== null && inCidr(value, networkValue, prefix, 128);
  });
}

function createDeadline(deadlineMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error("External CRM webhook absolute deadline exceeded"));
  }, deadlineMs);
  timeout.unref?.();

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeout),
  };
}

async function raceWithAbort<T>(
  operation: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    throw signal.reason;
  }

  return await Promise.race([
    operation,
    new Promise<never>((_, reject) => {
      signal.addEventListener(
        "abort",
        () => reject(signal.reason),
        { once: true },
      );
    }),
  ]);
}

async function defaultResolve(
  hostname: string,
  signal: AbortSignal,
): Promise<ResolvedAddress[]> {
  return raceWithAbort(
    lookup(hostname, { all: true, verbatim: true }),
    signal,
  );
}

async function defaultSendPinned(
  destination: ResolvedWebhook,
  body: string,
  signal: AbortSignal,
  maxResponseBytes: number,
): Promise<{ statusCode: number; bytesReceived: number }> {
  const { url, address, family } = destination;

  return raceWithAbort(
    new Promise((resolve, reject) => {
      const outbound = httpsRequest(
        {
          protocol: "https:",
          hostname: address,
          family,
          port: url.port ? Number(url.port) : 443,
          path: `${url.pathname}${url.search}`,
          method: "POST",
          servername: isIP(normalizeUrlHostname(url.hostname))
            ? undefined
            : normalizeUrlHostname(url.hostname),
          signal,
          headers: {
            Host: url.host,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (response) => {
          let bytesReceived = 0;
          const statusCode = response.statusCode || 500;

          response.on("data", (chunk: Buffer) => {
            bytesReceived += chunk.length;
            if (bytesReceived > maxResponseBytes) {
              response.destroy(
                new Error("External CRM webhook response size limit exceeded"),
              );
            }
          });
          response.once("end", () => resolve({ statusCode, bytesReceived }));
          response.once("error", reject);
        },
      );

      outbound.once("error", reject);
      outbound.end(body);
    }),
    signal,
  );
}

const DEFAULT_DEPENDENCIES: WebhookDeliveryDependencies = {
  resolve: defaultResolve,
  sendPinned: defaultSendPinned,
};

async function resolveValidatedDestination(
  webhookUrl: string,
  dependencies: WebhookDeliveryDependencies,
  signal: AbortSignal,
): Promise<ResolvedWebhook> {
  let url: URL;

  try {
    url = new URL(webhookUrl);
  } catch {
    throw new Error("External CRM webhook URL is invalid");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !url.hostname
  ) {
    throw new Error(
      "External CRM webhook must use HTTPS without embedded credentials",
    );
  }

  const hostname = normalizeUrlHostname(url.hostname);
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await raceWithAbort(
        dependencies.resolve(hostname, signal),
        signal,
      );

  if (
    !addresses.length ||
    addresses.some(({ address }) => !isGlobalUnicastIp(address))
  ) {
    throw new Error("External CRM webhook destination is not globally routable");
  }

  const selected = addresses[0];

  return {
    url,
    address: selected.address,
    family: selected.family as 4 | 6,
  };
}

export async function validateExternalCrmWebhookUrl(
  webhookUrl: string,
): Promise<ResolvedWebhook> {
  const deadline = createDeadline(DEFAULT_WEBHOOK_DEADLINE_MS);

  try {
    return await resolveValidatedDestination(
      webhookUrl,
      DEFAULT_DEPENDENCIES,
      deadline.signal,
    );
  } finally {
    deadline.clear();
  }
}

export async function deliverExternalCrmWebhook(
  webhook: ExternalCrmWebhookRequest,
  dependencies: WebhookDeliveryDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const deadline = createDeadline(
    webhook.deadlineMs || DEFAULT_WEBHOOK_DEADLINE_MS,
  );

  try {
    const destination = await resolveValidatedDestination(
      webhook.webhookUrl,
      dependencies,
      deadline.signal,
    );
    const body = JSON.stringify({
      workspaceId: webhook.workspaceId,
      actionType: webhook.actionType,
      payload: webhook.payload,
      timestamp: new Date().toISOString(),
    });
    const response = await raceWithAbort(
      dependencies.sendPinned(
        destination,
        body,
        deadline.signal,
        MAX_WEBHOOK_RESPONSE_BYTES,
      ),
      deadline.signal,
    );

    if (response.bytesReceived > MAX_WEBHOOK_RESPONSE_BYTES) {
      throw new Error("External CRM webhook response size limit exceeded");
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(
        `External CRM webhook rejected with status ${response.statusCode}`,
      );
    }
  } finally {
    deadline.clear();
  }
}

export const triggerExternalCRM = async (
  workspaceId: string,
  actionType: "booking" | "sale" | "lead",
  payload: unknown,
  webhookUrl?: string,
) => {
  if (!webhookUrl) return;

  await deliverExternalCrmWebhook({
    workspaceId,
    actionType,
    payload,
    webhookUrl,
  });
};
