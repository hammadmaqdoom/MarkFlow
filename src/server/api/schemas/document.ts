import { z } from "zod";

export const documentCreateSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  type: z.enum(["file", "folder"]),
  name: z.string().min(1).max(512),
  templateSlug: z.string().max(100).optional(),
});

export const documentUpdateSchema = z.object({
  name: z.string().min(1).max(512).optional(),
  path: z.string().min(1).max(1024).optional(),
  parentId: z.string().uuid().optional().nullable(),
  visibleInShare: z.boolean().optional(),
});

export const documentUpdateContentSchema = z.object({
  documentId: z.string().uuid(),
  contentYjs: z.string().optional(),
  contentMd: z.string().optional(),
});
