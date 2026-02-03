import { z } from "zod";

export const exportCreateSchema = z.object({
  projectId: z.string().uuid(),
});

export type ExportCreateInput = z.infer<typeof exportCreateSchema>;
