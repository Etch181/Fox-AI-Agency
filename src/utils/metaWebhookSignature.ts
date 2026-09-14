import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaWebhookSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined,
): boolean {
  if (!rawBody?.length || !signatureHeader || !appSecret?.trim()) {
    return false;
  }

  if (!signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const suppliedHex = signatureHeader.slice("sha256=".length);
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) {
    return false;
  }

  const expected = createHmac("sha256", appSecret.trim())
    .update(rawBody)
    .digest();
  const supplied = Buffer.from(suppliedHex, "hex");

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
