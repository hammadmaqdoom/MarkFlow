import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  teamCreateSchema,
  teamUpdateSchema,
  teamAddMemberSchema,
  teamRoleSchema,
} from "@/server/api/schemas/team";
import { slugFromName, uniqueSlug } from "@/server/lib/slug";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function assertWorkspaceMember(
  supabase: Context["supabase"],
  workspaceId: string,
  userId: string
) {
  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
  const isOwner = (ws as { owner_id: string }).owner_id === userId;
  if (isOwner) return { isOwner: true as const, isAdmin: true };
  const { data: member } = await supabase.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
  if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a workspace member" });
  return { isOwner: false as const, isAdmin: (member as { role: string }).role === "admin" };
}

async function assertTeamManage(supabase: Context["supabase"], teamId: string, userId: string) {
  const { data: team } = await supabase.from("teams").select("workspace_id").eq("id", teamId).single();
  if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  const access = await assertWorkspaceMember(supabase as never, team.workspace_id, userId);
  if (access.isOwner || access.isAdmin) return;
  const { data: lead } = await supabase.from("team_members").select("id").eq("team_id", teamId).eq("user_id", userId).eq("role", "lead").maybeSingle();
  if (!lead) throw new TRPCError({ code: "FORBIDDEN", message: "Only owner, admin, or team lead can manage members" });
}

export const teamRouter = router({
  listByWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.supabase, input.workspaceId, ctx.user.id);
      const { data: teams, error } = await ctx.supabase
        .from("teams")
        .select("*")
        .eq("workspace_id", input.workspaceId)
        .order("name");
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      const list = teams ?? [];
      if (list.length === 0) return [];
      const teamIds = list.map((t: { id: string }) => t.id);
      const { data: memberRows } = await ctx.supabase.from("team_members").select("team_id").in("team_id", teamIds);
      const countByTeam: Record<string, number> = {};
      for (const row of memberRows ?? []) {
        const tid = (row as { team_id: string }).team_id;
        countByTeam[tid] = (countByTeam[tid] ?? 0) + 1;
      }
      return list.map((t: { id: string } & Record<string, unknown>) => ({ ...t, member_count: countByTeam[t.id] ?? 0 }));
    }),

  create: protectedProcedure
    .input(teamCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const access = await assertWorkspaceMember(ctx.supabase, input.workspaceId, ctx.user.id);
      if (!access.isOwner && !access.isAdmin)
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can create teams" });
      const baseSlug = input.slug ?? slugFromName(input.name);
      const slug = await uniqueSlug(baseSlug, async (s) => {
        const { data } = await ctx.supabase.from("teams").select("id").eq("workspace_id", input.workspaceId).eq("slug", s).maybeSingle();
        return !!data;
      });
      const { data, error } = await ctx.supabase
        .from("teams")
        .insert({
          workspace_id: input.workspaceId,
          name: input.name,
          slug,
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  update: protectedProcedure
    .input(z.object({ teamId: z.string().uuid(), data: teamUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { data: teamRow } = await ctx.supabase.from("teams").select("workspace_id").eq("id", input.teamId).single();
      if (!teamRow) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      const access = await assertWorkspaceMember(ctx.supabase, teamRow.workspace_id, ctx.user.id);
      if (!access.isOwner && !access.isAdmin)
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can update teams" });
      const update: Record<string, string | null | undefined> = {};
      if (input.data.name !== undefined) update.name = input.data.name;
      if (input.data.slug !== undefined) update.slug = input.data.slug;
      if (input.data.description !== undefined) update.description = input.data.description;
      const { data, error } = await ctx.supabase.from("teams").update(update).eq("id", input.teamId).select().single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: team } = await ctx.supabase.from("teams").select("workspace_id").eq("id", input.teamId).single();
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      const access = await assertWorkspaceMember(ctx.supabase, team.workspace_id, ctx.user.id);
      if (!access.isOwner && !access.isAdmin)
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can delete teams" });
      const { error } = await ctx.supabase.from("teams").delete().eq("id", input.teamId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: team } = await ctx.supabase.from("teams").select("workspace_id").eq("id", input.teamId).single();
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      await assertWorkspaceMember(ctx.supabase, team.workspace_id, ctx.user.id);
      const { data, error } = await ctx.supabase
        .from("team_members")
        .select("*, profiles:user_id(id, email, full_name, avatar_url)")
        .eq("team_id", input.teamId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  addMember: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }).merge(teamAddMemberSchema))
    .mutation(async ({ ctx, input }) => {
      await assertTeamManage(ctx.supabase, input.teamId, ctx.user.id);
      const { data: team } = await ctx.supabase.from("teams").select("workspace_id").eq("id", input.teamId).single();
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      const isWorkspaceMember =
        (await ctx.supabase.from("workspaces").select("id").eq("id", team.workspace_id).eq("owner_id", input.userId).maybeSingle()).data != null ||
        (await ctx.supabase.from("workspace_members").select("id").eq("workspace_id", team.workspace_id).eq("user_id", input.userId).maybeSingle()).data != null;
      if (!isWorkspaceMember) throw new TRPCError({ code: "BAD_REQUEST", message: "User must be a workspace member to add to team" });
      const { data, error } = await ctx.supabase
        .from("team_members")
        .insert({ team_id: input.teamId, user_id: input.userId, role: input.role })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Already a team member" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return data;
    }),

  removeMember: protectedProcedure
    .input(z.object({ teamId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertTeamManage(ctx.supabase, input.teamId, ctx.user.id);
      const { error } = await ctx.supabase.from("team_members").delete().eq("team_id", input.teamId).eq("user_id", input.userId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ teamId: z.string().uuid(), userId: z.string().uuid(), role: teamRoleSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertTeamManage(ctx.supabase, input.teamId, ctx.user.id);
      const { error } = await ctx.supabase
        .from("team_members")
        .update({ role: input.role })
        .eq("team_id", input.teamId)
        .eq("user_id", input.userId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
