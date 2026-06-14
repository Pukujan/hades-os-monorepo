import { test, describe } from "node:test";
import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../tokenCrypto.js");
  } catch (error) {
    throw new Error("Missing tokenCrypto.js", { cause: error });
  }
}

describe("tokenCrypto", () => {
  const TEST_KEY = "a".repeat(64); // 32 bytes hex-encoded

  test("createTokenCrypto throws when ENCRYPTION_KEY is missing", async () => {
    const mod = await loadModule();
    assert.throws(
      () => mod.createTokenCrypto(),
      (err) => err.code === "missing_encryption_key"
    );
  });

  test("createTokenCrypto throws when key is wrong length", async () => {
    const mod = await loadModule();
    assert.throws(
      () => mod.createTokenCrypto({ encryptionKey: "tooshort" }),
      (err) => err.code === "missing_encryption_key"
    );
  });

  test("encrypt returns a base64 string", async () => {
    const mod = await loadModule();
    const crypto = mod.createTokenCrypto({ encryptionKey: TEST_KEY });
    const result = crypto.encrypt("hello");
    assert.equal(typeof result, "string");
    assert.ok(result.length > 0);
  });

  test("decrypt returns the original plaintext", async () => {
    const mod = await loadModule();
    const crypto = mod.createTokenCrypto({ encryptionKey: TEST_KEY });
    const original = "123456:SECRET_TOKEN_VALUE";
    const encrypted = crypto.encrypt(original);
    const decrypted = crypto.decrypt(encrypted);
    assert.equal(decrypted, original);
  });

  test("decrypt with wrong key throws", async () => {
    const mod = await loadModule();
    const keyA = "a".repeat(64);
    const keyB = "b".repeat(64);
    const cryptoA = mod.createTokenCrypto({ encryptionKey: keyA });
    const cryptoB = mod.createTokenCrypto({ encryptionKey: keyB });
    const encrypted = cryptoA.encrypt("secret");
    assert.throws(() => cryptoB.decrypt(encrypted));
  });

  test("each encryption produces a different ciphertext", async () => {
    const mod = await loadModule();
    const crypto = mod.createTokenCrypto({ encryptionKey: TEST_KEY });
    const a = crypto.encrypt("same-value");
    const b = crypto.encrypt("same-value");
    assert.notEqual(a, b);
  });
});
