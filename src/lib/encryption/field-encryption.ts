import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENVELOPE_PREFIX = "enc:v1";

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("Missing ENCRYPTION_KEY");
  }

  if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }

  return Buffer.from(keyHex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENVELOPE_PREFIX}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    return ciphertext;
  }

  // Backward compatibility for any pre-encryption values in existing rows.
  if (!ciphertext.startsWith(`${ENVELOPE_PREFIX}:`)) {
    return ciphertext;
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted payload format");
  }

  const [, , ivB64, tagB64, encryptedB64] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function maskAccountNumber(accountNumber: string): string {
  const digits = (accountNumber ?? "").replace(/\D+/g, "");
  const suffix = digits.slice(-4);
  return `****${suffix}`;
}
