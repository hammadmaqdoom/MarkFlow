import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function assertEditorProject(
  ctx: { supabase: Context["supabase"]; user: { id: string } },
  projectId: string
) {
  const { data: p } = await ctx.supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();
  if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  const { data: w } = await ctx.supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", (p as { workspace_id: string }).workspace_id)
    .single();
  if ((w as { owner_id: string } | null)?.owner_id === ctx.user.id) return;
  const { data: m } = await ctx.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", (p as { workspace_id: string }).workspace_id)
    .eq("user_id", ctx.user.id)
    .single();
  if (m && (m as { role: string }).role && ["owner", "admin", "editor"].includes((m as { role: string }).role))
    return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Editor or above required" });
}

const conceptInputSchema = z
  .object({
    idea: z.string().optional(),
    audience: z.string().optional(),
    goals: z.string().optional(),
    context: z.string().optional(),
    productType: z.string().optional(),
  })
  .passthrough();

const departmentOverridesSchema = z.record(z.string(), z.string().optional()).optional();

export const projectSpecRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      const { data, error } = await ctx.supabase
        .from("project_specs")
        .select("concept_input, department_overrides, updated_at")
        .eq("project_id", input.projectId)
        .maybeSingle();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) return { conceptInput: {}, departmentOverrides: {}, updatedAt: null };
      return {
        conceptInput: (data as { concept_input: unknown }).concept_input ?? {},
        departmentOverrides: (data as { department_overrides: unknown }).department_overrides ?? {},
        updatedAt: (data as { updated_at: string | null }).updated_at ?? null,
      };
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        conceptInput: conceptInputSchema,
        departmentOverrides: departmentOverridesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      const { data, error } = await ctx.supabase
        .from("project_specs")
        .upsert(
          {
            project_id: input.projectId,
            concept_input: input.conceptInput,
            department_overrides: input.departmentOverrides ?? {},
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        )
        .select("concept_input, department_overrides, updated_at")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return {
        conceptInput: (data as { concept_input: unknown }).concept_input ?? {},
        departmentOverrides: (data as { department_overrides: unknown }).department_overrides ?? {},
        updatedAt: (data as { updated_at: string }).updated_at,
      };
    }),
});
