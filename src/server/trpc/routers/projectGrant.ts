import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

const grantRoleSchema = z.enum(["view", "edit"]);

export const projectGrantRouter = router({
  grantToWorkspace: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid(), role: grantRoleSchema }))
    .mutation(async ({ ctx, input }) => {
      const { data: project } = await ctx.supabase
        .from("projects")
        .select("workspace_id")
        .eq("id", input.projectId)
        .single();
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      if (project.workspace_id === input.workspaceId)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot grant project to its own workspace" });
      const isOwner = (await ctx.supabase.from("workspaces").select("id").eq("id", project.workspace_id).eq("owner_id", ctx.user.id).maybeSingle()).data != null;
      const { data: member } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      const canGrant = isOwner || (member as { role: string } | null)?.role === "admin" || (member as { role: string } | null)?.role === "editor";
      if (!canGrant) throw new TRPCError({ code: "FORBIDDEN", message: "Only owner, admin, or editor can grant project access" });
      const { data, error } = await ctx.supabase
        .from("project_workspace_grants")
        .insert({
          project_id: input.projectId,
          workspace_id: input.workspaceId,
          role: input.role,
          granted_by: ctx.user.id,
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Project already granted to this workspace" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return data;
    }),

  revokeGrant: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: grant } = await ctx.supabase
        .from("project_workspace_grants")
        .select("id, granted_by, project_id")
        .eq("project_id", input.projectId)
        .eq("workspace_id", input.workspaceId)
        .maybeSingle();
      if (!grant) throw new TRPCError({ code: "NOT_FOUND", message: "Grant not found" });
      const { data: project } = await ctx.supabase.from("projects").select("workspace_id").eq("id", input.projectId).single();
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const isOwner = (await ctx.supabase.from("workspaces").select("id").eq("id", project.workspace_id).eq("owner_id", ctx.user.id).maybeSingle()).data != null;
      const { data: member } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", project.workspace_id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      const canRevoke =
        (grant as { granted_by: string }).granted_by === ctx.user.id ||
        isOwner ||
        (member as { role: string } | null)?.role === "admin";
      if (!canRevoke) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot revoke this grant" });
      const { error } = await ctx.supabase
        .from("project_workspace_grants")
        .delete()
        .eq("project_id", input.projectId)
        .eq("workspace_id", input.workspaceId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  listGrantsForProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: project } = await ctx.supabase.from("projects").select("workspace_id").eq("id", input.projectId).single();
      if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const isMember =
        (await ctx.supabase.from("workspaces").select("id").eq("id", project.workspace_id).eq("owner_id", ctx.user.id).maybeSingle()).data != null ||
        (await ctx.supabase.from("workspace_members").select("id").eq("workspace_id", project.workspace_id).eq("user_id", ctx.user.id).maybeSingle()).data != null;
      if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a project workspace member" });
      const { data: grants, error } = await ctx.supabase
        .from("project_workspace_grants")
        .select("id, workspace_id, role, granted_by, created_at")
        .eq("project_id", input.projectId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      const withWorkspace = await Promise.all(
        (grants ?? []).map(async (g) => {
          const { data: ws } = await ctx.supabase.from("workspaces").select("name, slug").eq("id", g.workspace_id).single();
          return {
            id: g.id,
            workspace_id: g.workspace_id,
            workspace_name: (ws as { name: string } | null)?.name ?? "",
            workspace_slug: (ws as { slug: string } | null)?.slug ?? "",
            role: g.role,
            granted_by: g.granted_by,
            created_at: g.created_at,
          };
        })
      );
      return withWorkspace;
    }),

  listSharedWithUs: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const isMember =
        (await ctx.supabase.from("workspaces").select("id").eq("id", input.workspaceId).eq("owner_id", ctx.user.id).maybeSingle()).data != null ||
        (await ctx.supabase.from("workspace_members").select("id").eq("workspace_id", input.workspaceId).eq("user_id", ctx.user.id).maybeSingle()).data != null;
      if (!isMember) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
      const { data: grants, error } = await ctx.supabase
        .from("project_workspace_grants")
        .select("id, project_id, role")
        .eq("workspace_id", input.workspaceId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      const list: Array<{ projectId: string; projectName: string; projectSlug: string; sourceWorkspaceSlug: string; role: string }> = [];
      for (const g of grants ?? []) {
        const { data: project } = await ctx.supabase.from("projects").select("name, slug, workspace_id").eq("id", g.project_id).single();
        if (!project) continue;
        const { data: sourceWs } = await ctx.supabase.from("workspaces").select("slug").eq("id", (project as { workspace_id: string }).workspace_id).single();
        list.push({
          projectId: g.project_id,
          projectName: (project as { name: string }).name,
          projectSlug: (project as { slug: string }).slug,
          sourceWorkspaceSlug: (sourceWs as { slug: string } | null)?.slug ?? "",
          role: g.role,
        });
      }
      return list;
    }),
});
