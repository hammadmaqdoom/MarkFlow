import { describe, it, expect } from "vitest";
import {
  workspaceCreateSchema,
  workspaceUpdateSchema,
  workspaceInviteSchema,
  workspaceCreateInviteLinkSchema,
} from "./workspace";

describe("workspaceCreateSchema", () => {
  it("accepts valid name and optional slug", () => {
    expect(workspaceCreateSchema.parse({ name: "My Workspace" })).toEqual({ name: "My Workspace" });
    expect(workspaceCreateSchema.parse({ name: "X", slug: "my-slug" })).toEqual({ name: "X", slug: "my-slug" });
  });

  it("rejects invalid slug", () => {
    expect(() => workspaceCreateSchema.parse({ name: "X", slug: "UPPER" })).toThrow();
    expect(() => workspaceCreateSchema.parse({ name: "X", slug: "has space" })).toThrow();
  });
});

describe("workspaceInviteSchema", () => {
  it("accepts valid email and role", () => {
    expect(workspaceInviteSchema.parse({ email: "a@b.co", role: "editor" })).toEqual({
      email: "a@b.co",
      role: "editor",
    });
  });

  it("rejects invalid email", () => {
    expect(() => workspaceInviteSchema.parse({ email: "not-email", role: "viewer" })).toThrow();
  });
});

describe("workspaceCreateInviteLinkSchema", () => {
  it("accepts workspaceId, role, optional expiresInDays", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      workspaceCreateInviteLinkSchema.parse({ workspaceId: uuid, role: "viewer" })
    ).toEqual({ workspaceId: uuid, role: "viewer" });
    expect(
      workspaceCreateInviteLinkSchema.parse({ workspaceId: uuid, role: "editor", expiresInDays: 14 })
    ).toEqual({ workspaceId: uuid, role: "editor", expiresInDays: 14 });
  });

  it("rejects owner role for invite link", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(() => workspaceCreateInviteLinkSchema.parse({ workspaceId: uuid, role: "owner" })).toThrow();
  });
});
