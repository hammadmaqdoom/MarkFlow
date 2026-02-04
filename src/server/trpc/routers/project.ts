import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { projectCreateSchema, projectUpdateSchema } from "@/server/api/schemas/project";
import { slugFromName, uniqueSlug } from "@/server/lib/slug";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function assertEditorOrOwner(
  ctx: { supabase: Context["supabase"]; user: { id: string } },
  workspaceId: string
) {
  const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (w?.owner_id === ctx.user.id) return;
  const { data: m } = await ctx.supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", ctx.user.id).single();
  if (m?.role && ["owner", "admin", "editor"].includes(m.role)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Editor or above required" });
}

async function assertAdminOrOwner(
  ctx: { supabase: Context["supabase"]; user: { id: string } },
  workspaceId: string
) {
  const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (w?.owner_id === ctx.user.id) return;
  const { data: m } = await ctx.supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", ctx.user.id).single();
  if (m?.role && ["owner", "admin"].includes(m.role)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Admin or owner required" });
}

export const projectRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", input.workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  create: protectedProcedure
    .input(projectCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEditorOrOwner(ctx, input.workspaceId);
      const baseSlug = input.slug ?? slugFromName(input.name);
      const slug = await uniqueSlug(baseSlug, async (s) => {
        const { data } = await ctx.supabase
          .from("projects")
          .select("id")
          .eq("workspace_id", input.workspaceId)
          .eq("slug", s)
          .maybeSingle();
        return !!data;
      });
      const { data, error } = await ctx.supabase
        .from("projects")
        .insert({
          workspace_id: input.workspaceId,
          name: input.name,
          slug,
          description: input.description ?? null,
          github_repo: input.github_repo ?? null,
          github_branch: input.github_branch ?? "main",
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), includeTree: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const { data: project, error } = await ctx.supabase
        .from("projects")
        .select("*")
        .eq("id", input.projectId)
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      if (!input.includeTree) return project;
      const { data: docs } = await ctx.supabase
        .from("documents")
        .select("id, project_id, parent_id, type, name, path, updated_at, visible_in_share")
        .eq("project_id", input.projectId)
        .order("path");
      return { ...project, documents: docs ?? [] };
    }),

  update: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), data: projectUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { data: p } = await ctx.supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", input.projectId)
        .single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      await assertEditorOrOwner(ctx, p.workspace_id);
      const update: Record<string, unknown> = {};
      if (input.data.name !== undefined) update.name = input.data.name;
      if (input.data.slug !== undefined) update.slug = input.data.slug;
      if (input.data.description !== undefined) update.description = input.data.description;
      if (input.data.github_repo !== undefined) update.github_repo = input.data.github_repo;
      if (input.data.github_branch !== undefined) update.github_branch = input.data.github_branch;
      if (input.data.sync_enabled !== undefined) update.sync_enabled = input.data.sync_enabled;
      const { data, error } = await ctx.supabase
        .from("projects")
        .update(update)
        .eq("id", input.projectId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: p } = await ctx.supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", input.projectId)
        .single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      await assertAdminOrOwner(ctx, p.workspace_id);
      const { error } = await ctx.supabase.from("projects").delete().eq("id", input.projectId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  connectGitHub: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), githubRepo: z.string().min(1).max(256), githubBranch: z.string().max(256).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", input.projectId).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      await assertEditorOrOwner(ctx, p.workspace_id);
      const { data, error } = await ctx.supabase
        .from("projects")
        .update({
          github_repo: input.githubRepo,
          github_branch: input.githubBranch ?? "main",
          sync_enabled: true,
        })
        .eq("id", input.projectId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  disconnectGitHub: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", input.projectId).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      await assertEditorOrOwner(ctx, p.workspace_id);
      const { data, error } = await ctx.supabase
        .from("projects")
        .update({ github_repo: null, github_branch: null, sync_enabled: false })
        .eq("id", input.projectId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),
});
