import crypto from "crypto";

function getEncryptionKey() {
  const raw = process.env.FOX_SECRET_KEY || "";

  if (!raw) {
    throw new Error(
      "FOX_SECRET_KEY is not configured"
    );
  }

  return crypto
    .createHash("sha256")
    .update(raw)
    .digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
}

export function decryptSecret(
  encrypted: {
    iv: string;
    tag: string;
    data: string;
  }
) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(encrypted.iv, "base64")
  );

  decipher.setAuthTag(
    Buffer.from(encrypted.tag, "base64")
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encrypted.data, "base64")
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
