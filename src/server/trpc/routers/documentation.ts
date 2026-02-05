import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";
import { runDocumentationOrchestrator } from "@/server/lib/ai/orchestrator";
import { getConfiguredProviders } from "@/server/lib/ai";
import { DOMAIN_IDS } from "@/server/lib/domains";
import { AI_PROVIDER_IDS } from "@/server/lib/ai/types";

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

export const documentationRouter = router({
  generate: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        provider: z.enum(AI_PROVIDER_IDS),
        domains: z.array(z.enum(DOMAIN_IDS)).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      const { data: spec } = await ctx.supabase
        .from("project_specs")
        .select("concept_input, domain_overrides")
        .eq("project_id", input.projectId)
        .maybeSingle();
      const conceptInput = (spec as { concept_input: unknown } | null)?.concept_input ?? {};
      const domainOverrides =
        (spec as { domain_overrides: unknown } | null)?.domain_overrides ?? {};
      const domains: ("compliance" | "product" | "design" | "marketing" | "technical")[] =
        input.domains && input.domains.length > 0 ? [...input.domains] : [...DOMAIN_IDS];
      const results = await runDocumentationOrchestrator({
        supabase: ctx.supabase,
        projectId: input.projectId,
        userId: ctx.user.id,
        providerId: input.provider,
        domains,
        conceptInput: conceptInput as Record<string, unknown>,
        domainOverrides: domainOverrides as Record<string, string | undefined>,
      });
      return { results };
    }),

  getConfiguredProviders: protectedProcedure.query(() => {
    return getConfiguredProviders();
  }),

  listGeneratedDocuments: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      const prefixes = ["Compliance/", "Product/", "Design/", "Marketing/", "Technical/"];
      const { data, error } = await ctx.supabase
        .from("documents")
        .select("id, path, name, type, updated_at")
        .eq("project_id", input.projectId)
        .or(prefixes.map((p) => `path.like.${p}%`).join(","));
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return (data ?? []).sort((a, b) => (a.path as string).localeCompare(b.path as string));
    }),
});
