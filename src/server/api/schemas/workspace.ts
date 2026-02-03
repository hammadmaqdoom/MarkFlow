import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase, alphanumeric and hyphens only");

export const workspaceCreateSchema = z.object({
  name: z.string().min(1).max(256),
  slug: slugSchema.optional(),
});

export const workspaceUpdateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  slug: slugSchema.optional(),
  logo_url: z.string().url().optional().nullable(),
});

export const workspaceInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export const workspaceUpdateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export const workspaceCreateInviteLinkSchema = z.object({
  workspaceId: z.string().uuid(),
  role: z.enum(["admin", "editor", "viewer"]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});
