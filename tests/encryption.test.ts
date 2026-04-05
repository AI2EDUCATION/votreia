import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";

describe("Encryption (AES-256-GCM)", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "sk-test-oauth-token-12345";
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(":")).toHaveLength(3); // iv:tag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same plaintext", () => {
    const plaintext = "same-token-value";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);

    expect(enc1).not.toBe(enc2); // Different IV each time
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("handles unicode content", () => {
    const plaintext = "Jeton d'accès avec émojis 🔐🇫🇷";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("throws on invalid encrypted data", () => {
    expect(() => decrypt("invalid-data")).toThrow();
    expect(() => decrypt("aa:bb")).toThrow();
  });
});
