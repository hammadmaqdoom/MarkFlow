import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIdentifier } from "./rate-limit";

describe("checkRateLimit", () => {
  it("allows first request", () => {
    expect(checkRateLimit("key1", 2, 60_000)).toEqual({ ok: true });
  });

  it("allows requests under limit", () => {
    const key = "key-under";
    expect(checkRateLimit(key, 3, 60_000)).toEqual({ ok: true });
    expect(checkRateLimit(key, 3, 60_000)).toEqual({ ok: true });
    expect(checkRateLimit(key, 3, 60_000)).toEqual({ ok: true });
  });

  it("rejects when over limit", () => {
    const key = "key-over";
    checkRateLimit(key, 2, 60_000);
    checkRateLimit(key, 2, 60_000);
    const result = checkRateLimit(key, 2, 60_000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });
});

describe("getClientIdentifier", () => {
  it("returns first x-forwarded-for when present", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientIdentifier(req)).toBe("1.2.3.4");
  });

  it("returns x-real-ip when present and no forwarded", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "10.0.0.1" },
    });
    expect(getClientIdentifier(req)).toBe("10.0.0.1");
  });

  it("returns null when no IP headers", () => {
    const req = new Request("https://example.com");
    expect(getClientIdentifier(req)).toBe(null);
  });
});
