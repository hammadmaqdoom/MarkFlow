import { describe, it, expect, vi } from "vitest";
import { slugFromName, uniqueSlug } from "./slug";

describe("slugFromName", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugFromName("My Workspace")).toBe("my-workspace");
  });

  it("strips non-alphanumeric except hyphens", () => {
    expect(slugFromName("Hello! World?")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugFromName("a   b")).toBe("a-b");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugFromName("  x  ")).toBe("x");
    expect(slugFromName("--ab--")).toBe("ab");
  });

  it("returns workspace for empty result", () => {
    expect(slugFromName("!!!")).toBe("workspace");
  });
});

describe("uniqueSlug", () => {
  it("returns base when exists returns false", async () => {
    const exists = vi.fn().mockResolvedValue(false);
    expect(await uniqueSlug("foo", exists)).toBe("foo");
    expect(exists).toHaveBeenCalledWith("foo");
  });

  it("appends suffix when base exists", async () => {
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
    expect(await uniqueSlug("foo", exists)).toBe("foo-1");
    expect(exists).toHaveBeenCalledWith("foo");
    expect(exists).toHaveBeenCalledWith("foo-1");
  });

  it("increments suffix until unique", async () => {
    const exists = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    expect(await uniqueSlug("foo", exists)).toBe("foo-2");
  });
});
