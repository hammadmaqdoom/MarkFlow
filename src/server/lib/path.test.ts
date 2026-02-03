import { describe, it, expect } from "vitest";
import { normalizePath, pathFromParentAndName } from "./path";

describe("normalizePath", () => {
  it("replaces backslashes with forward slashes", () => {
    expect(normalizePath("a\\b\\c")).toBe("a/b/c");
  });

  it("collapses multiple slashes", () => {
    expect(normalizePath("a///b")).toBe("a/b");
  });

  it("removes leading and trailing slashes", () => {
    expect(normalizePath("/a/b/")).toBe("a/b");
  });

  it("removes . segments", () => {
    expect(normalizePath("a/./b")).toBe("a/b");
  });

  it("filters out .. segments (does not resolve parent)", () => {
    expect(normalizePath("a/b/..")).toBe("a/b");
    expect(normalizePath("a/../b")).toBe("a/b");
  });

  it("returns empty for empty input", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("pathFromParentAndName", () => {
  it("returns safe name when parent is null", () => {
    expect(pathFromParentAndName(null, "file.md")).toBe("file.md");
  });

  it("replaces slashes in name with hyphens", () => {
    expect(pathFromParentAndName(null, "a/b")).toBe("a-b");
  });

  it("joins parent and name", () => {
    expect(pathFromParentAndName("docs", "readme.md")).toBe("docs/readme.md");
  });

  it("normalizes joined path", () => {
    expect(pathFromParentAndName("a/b", "c")).toBe("a/b/c");
  });
});
