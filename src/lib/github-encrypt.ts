/**
 * Encrypt/decrypt GitHub token for storage in profiles.github_token_encrypted.
 * Uses AES-256-GCM; ENCRYPTION_KEY must be 32 bytes (hex or base64).
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const SALT_LEN = 16;
const KEY_LEN = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 32) throw new Error("ENCRYPTION_KEY must be at least 32 chars");
  return scryptSync(raw.slice(0, 64), "markflow-github", KEY_LEN);
}

export function encryptGitHubToken(plain: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptGitHubToken(encrypted: string): string {
  const key = getKey();
  const buf = Buffer.from(encrypted, "base64");
  if (buf.length < IV_LEN + TAG_LEN) throw new Error("Invalid encrypted token");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final("utf8");
}
