import { describe, it, expect } from "vitest";
import {
  documentCreateSchema,
  documentUpdateSchema,
  documentUpdateContentSchema,
} from "./document";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

describe("documentCreateSchema", () => {
  it("accepts valid file create", () => {
    expect(
      documentCreateSchema.parse({
        projectId: validUuid,
        type: "file",
        name: "readme.md",
      })
    ).toEqual({ projectId: validUuid, type: "file", name: "readme.md" });
  });

  it("accepts folder with optional parentId and templateSlug", () => {
    expect(
      documentCreateSchema.parse({
        projectId: validUuid,
        parentId: validUuid,
        type: "folder",
        name: "Docs",
        templateSlug: "note",
      })
    ).toEqual({
      projectId: validUuid,
      parentId: validUuid,
      type: "folder",
      name: "Docs",
      templateSlug: "note",
    });
  });

  it("rejects invalid type", () => {
    expect(() =>
      documentCreateSchema.parse({
        projectId: validUuid,
        type: "other",
        name: "x",
      })
    ).toThrow();
  });
});

describe("documentUpdateContentSchema", () => {
  it("accepts documentId with optional content", () => {
    expect(
      documentUpdateContentSchema.parse({ documentId: validUuid })
    ).toEqual({ documentId: validUuid });
    expect(
      documentUpdateContentSchema.parse({ documentId: validUuid, contentMd: "# Hi" })
    ).toEqual({ documentId: validUuid, contentMd: "# Hi" });
  });
});
