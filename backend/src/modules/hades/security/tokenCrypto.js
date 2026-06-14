import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(encryptionKey) {
  const raw = Buffer.isBuffer(encryptionKey)
    ? encryptionKey
    : Buffer.from(encryptionKey, "hex");
  if (raw.length !== 32) {
    throw Object.assign(
      new Error("ENCRYPTION_KEY must be a 32-byte hex-encoded key"),
      { code: "missing_encryption_key" }
    );
  }
  return raw;
}

export function createTokenCrypto({ encryptionKey } = {}) {
  if (!encryptionKey) {
    throw Object.assign(
      new Error("ENCRYPTION_KEY is required"),
      { code: "missing_encryption_key" }
    );
  }

  const key = deriveKey(encryptionKey);

  function encrypt(plaintext) {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf-8")),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  function decrypt(payload) {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = raw.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf-8");
  }

  return { encrypt, decrypt };
}
