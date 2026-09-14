import assert from "node:assert/strict";
import test from "node:test";

import {
  deliverExternalCrmWebhook,
  isGlobalUnicastIp,
  MAX_WEBHOOK_RESPONSE_BYTES,
  type WebhookDeliveryDependencies,
} from "../src/services/crmService.ts";

const denied = [
  "127.0.0.1",
  "0.0.0.0",
  "10.0.0.1",
  "172.16.0.1",
  "192.168.1.1",
  "169.254.1.1",
  "100.64.0.1",
  "224.0.0.1",
  "192.0.2.1",
  "198.51.100.1",
  "203.0.113.1",
  "198.18.0.1",
  "192.88.99.1",
  "240.0.0.1",
  "::",
  "::1",
  "fc00::1",
  "fd00::1",
  "fe80::1",
  "fec0::1",
  "ff02::1",
  "2001::1",
  "2001:1::1",
  "2001:db8::1",
  "2001:2::1",
  "2002:0808:0808::1",
  "3fff::1",
  "::ffff:127.0.0.1",
  "::ffff:10.0.0.1",
  "64:ff9b::a00:1",
];

test("SSRF classifier rejects non-global IPv4 and IPv6 ranges", () => {
  for (const address of denied) {
    assert.equal(isGlobalUnicastIp(address), false, address);
  }
});

test("SSRF classifier permits representative public unicast addresses", () => {
  assert.equal(isGlobalUnicastIp("8.8.8.8"), true);
  assert.equal(isGlobalUnicastIp("1.1.1.1"), true);
  assert.equal(isGlobalUnicastIp("2606:4700:4700::1111"), true);
});

function dependencies(
  overrides: Partial<WebhookDeliveryDependencies> = {},
): WebhookDeliveryDependencies {
  return {
    async resolve() {
      return [{ address: "8.8.8.8", family: 4 }];
    },
    async sendPinned() {
      return { statusCode: 204, bytesReceived: 0 };
    },
    ...overrides,
  };
}

const request = {
  workspaceId: "workspace-a",
  actionType: "lead" as const,
  payload: { id: "lead-a" },
  webhookUrl: "https://hooks.example.test/crm",
};

test("public IPv6 URL literals are normalized without DNS lookup", async () => {
  let dnsCalled = false;
  let pinnedAddress = "";

  await deliverExternalCrmWebhook(
    {
      ...request,
      webhookUrl: "https://[2606:4700:4700::1111]/hook",
    },
    dependencies({
      async resolve() {
        dnsCalled = true;
        return [];
      },
      async sendPinned(destination) {
        pinnedAddress = destination.address;
        return { statusCode: 204, bytesReceived: 0 };
      },
    }),
  );

  assert.equal(dnsCalled, false);
  assert.equal(pinnedAddress, "2606:4700:4700::1111");
});

test("mixed safe and unsafe DNS answers fail closed before connection", async () => {
  let sent = false;

  await assert.rejects(
    deliverExternalCrmWebhook(
      request,
      dependencies({
        async resolve() {
          return [
            { address: "8.8.8.8", family: 4 },
            { address: "127.0.0.1", family: 4 },
          ];
        },
        async sendPinned() {
          sent = true;
          return { statusCode: 204, bytesReceived: 0 };
        },
      }),
    ),
    /destination/i,
  );
  assert.equal(sent, false);
});

test("delivery pins the connection to the validated DNS address", async () => {
  let pinnedAddress = "";
  let pinnedHostname = "";

  await deliverExternalCrmWebhook(
    request,
    dependencies({
      async resolve() {
        return [{ address: "8.8.4.4", family: 4 }];
      },
      async sendPinned(destination) {
        pinnedAddress = destination.address;
        pinnedHostname = destination.url.hostname;
        return { statusCode: 204, bytesReceived: 0 };
      },
    }),
  );

  assert.equal(pinnedAddress, "8.8.4.4");
  assert.equal(pinnedHostname, "hooks.example.test");
});

for (const phase of ["dns", "connect", "headers", "body"] as const) {
  test(`one absolute deadline covers the ${phase} phase`, async () => {
    const never = () => new Promise<never>(() => undefined);
    const deps = dependencies(
      phase === "dns"
        ? { resolve: never }
        : { sendPinned: never },
    );

    await assert.rejects(
      deliverExternalCrmWebhook(
        { ...request, deadlineMs: 20 },
        deps,
      ),
      /deadline/i,
    );
  });
}

test("redirect responses are rejected without following them", async () => {
  await assert.rejects(
    deliverExternalCrmWebhook(
      request,
      dependencies({
        async sendPinned() {
          return { statusCode: 302, bytesReceived: 0 };
        },
      }),
    ),
    /status 302/i,
  );
});

test("redirects to private targets are rejected without re-resolution", async () => {
  let resolveCount = 0;

  await assert.rejects(
    deliverExternalCrmWebhook(
      request,
      dependencies({
        async resolve() {
          resolveCount += 1;
          return [{ address: "8.8.8.8", family: 4 }];
        },
        async sendPinned() {
          return {
            statusCode: 302,
            bytesReceived: 0,
            location: "https://127.0.0.1/private",
          };
        },
      }),
    ),
    /status 302/i,
  );
  assert.equal(resolveCount, 1);
});

test("oversized responses are rejected", async () => {
  await assert.rejects(
    deliverExternalCrmWebhook(
      request,
      dependencies({
        async sendPinned() {
          return {
            statusCode: 200,
            bytesReceived: MAX_WEBHOOK_RESPONSE_BYTES + 1,
          };
        },
      }),
    ),
    /response size/i,
  );
});
