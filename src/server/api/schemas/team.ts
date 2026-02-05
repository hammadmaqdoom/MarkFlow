import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase, alphanumeric and hyphens only");

export const teamCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(256),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
});

export const teamUpdateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
});

export const teamAddMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["lead", "member"]),
});

export const teamRoleSchema = z.enum(["lead", "member"]);
