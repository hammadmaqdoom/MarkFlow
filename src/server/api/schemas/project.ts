import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: lowercase, alphanumeric and hyphens only");

export const projectCreateSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(256),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional(),
  github_repo: z.string().max(256).optional(),
  github_branch: z.string().max(256).optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(256).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(2000).optional().nullable(),
  github_repo: z.string().max(256).optional().nullable(),
  github_branch: z.string().max(256).optional(),
  sync_enabled: z.boolean().optional(),
});
