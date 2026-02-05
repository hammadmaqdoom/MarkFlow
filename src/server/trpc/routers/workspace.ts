import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  workspaceCreateSchema,
  workspaceCreateInviteLinkSchema,
  workspaceInviteSchema,
  workspaceUpdateMemberRoleSchema,
  workspaceUpdateSchema,
} from "@/server/api/schemas/workspace";
import { slugFromName, uniqueSlug } from "@/server/lib/slug";
import { protectedProcedure, router } from "../trpc";

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: owned } = await ctx.supabase
      .from("workspaces")
      .select("*")
      .eq("owner_id", ctx.user.id);
    const { data: memberRows } = await ctx.supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", ctx.user.id);
    const memberIds = (memberRows ?? []).map((r) => r.workspace_id);
    if (memberIds.length === 0 && (owned ?? []).length > 0) {
      return owned ?? [];
    }
    if (memberIds.length === 0) return owned ?? [];
    const { data: memberWorkspaces } = await ctx.supabase
      .from("workspaces")
      .select("*")
      .in("id", memberIds);
    const byId = new Map((owned ?? []).map((w) => [w.id, w]));
    (memberWorkspaces ?? []).forEach((w) => byId.set(w.id, w));
    return Array.from(byId.values());
  }),

  create: protectedProcedure
    .input(workspaceCreateSchema)
    .mutation(async ({ ctx, input }) => {
      const baseSlug = input.slug ?? slugFromName(input.name);
      const slug = await uniqueSlug(baseSlug, async (s) => {
        const { data } = await ctx.supabase.from("workspaces").select("id").eq("slug", s).maybeSingle();
        return !!data;
      });
      const { data, error } = await ctx.supabase
        .from("workspaces")
        .insert({
          name: input.name,
          slug,
          owner_id: ctx.user.id,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  getById: protectedProcedure
    .input(z.object({ idOrSlug: z.string().uuid().or(z.string().min(1)) }))
    .query(async ({ ctx, input }) => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(input.idOrSlug);
      const { data, error } = await ctx.supabase
        .from("workspaces")
        .select("*")
        .match(isUuid ? { id: input.idOrSlug } : { slug: input.idOrSlug })
        .maybeSingle();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      return data;
    }),

  update: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), data: workspaceUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("id, owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      if (ws.owner_id !== ctx.user.id) {
        const { data: roleRow } = await ctx.supabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", input.workspaceId)
          .eq("user_id", ctx.user.id)
          .maybeSingle();
        if (roleRow?.role !== "admin")
          throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can update" });
      }
      const update: Record<string, unknown> = {};
      if (input.data.name !== undefined) update.name = input.data.name;
      if (input.data.slug !== undefined) update.slug = input.data.slug;
      if (input.data.logo_url !== undefined) update.logo_url = input.data.logo_url;
      const { data, error } = await ctx.supabase
        .from("workspaces")
        .update(update)
        .eq("id", input.workspaceId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      if (ws.owner_id !== ctx.user.id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can delete workspace" });
      const { error } = await ctx.supabase.from("workspaces").delete().eq("id", input.workspaceId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: ws, error: wsErr } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (wsErr || !ws) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: wsErr?.message ?? "Workspace not found" });

      const { data: members, error } = await ctx.supabase
        .from("workspace_members")
        .select("*, profiles:user_id(id, email, full_name, avatar_url)")
        .eq("workspace_id", input.workspaceId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const { data: ownerProfile } = await ctx.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("id", ws.owner_id)
        .single();

      const memberRows = (members ?? []) as Array<{
        user_id: string;
        role: string;
        profiles: { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
      }>;
      const byUserId = new Map(
        memberRows.map((m) => [
          m.user_id,
          { ...m, role: m.role as "owner" | "admin" | "editor" | "viewer" },
        ])
      );

      type MemberWithProfile = {
        user_id: string;
        role: "owner" | "admin" | "editor" | "viewer";
        profiles: { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
      };
      const ownerEntry: MemberWithProfile = {
        user_id: ws.owner_id,
        role: "owner",
        profiles: ownerProfile ?? { id: ws.owner_id, email: null, full_name: null, avatar_url: null },
      };
      const rest: MemberWithProfile[] = memberRows
        .filter((m) => m.user_id !== ws.owner_id)
        .map((m) => ({ ...m, role: m.role as "owner" | "admin" | "editor" | "viewer" }));
      return [ownerEntry, ...rest] as MemberWithProfile[];
    }),

  inviteMember: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }).merge(workspaceInviteSchema))
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const isOwner = ws.owner_id === ctx.user.id;
      const { data: memberRow } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (!isOwner && memberRow?.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can invite" });
      const { data: profile } = await ctx.supabase
        .from("profiles")
        .select("id")
        .eq("email", input.email)
        .maybeSingle();
      if (profile) {
        const { error } = await ctx.supabase.from("workspace_members").insert({
          workspace_id: input.workspaceId,
          user_id: profile.id,
          role: input.role,
          invited_by: ctx.user.id,
        });
        if (error) {
          if (error.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Already a member" });
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
        return { added: true as const, ok: true };
      }
      // User not found: create invite link so they can sign up and accept
      const roleForInvite = input.role === "owner" ? "viewer" : input.role;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      const { data: invite, error } = await ctx.supabase
        .from("workspace_invites")
        .insert({
          workspace_id: input.workspaceId,
          role: roleForInvite,
          expires_at: expiresAt.toISOString(),
          created_by: ctx.user.id,
        })
        .select("token")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      const link = `/invite/${invite.token}`;
      return { added: false as const, inviteLink: link };
    }),

  updateMemberRole: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }).merge(workspaceUpdateMemberRoleSchema))
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const isOwner = ws.owner_id === ctx.user.id;
      const { data: myMember } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (!isOwner && myMember?.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can update roles" });
      const { error } = await ctx.supabase
        .from("workspace_members")
        .update({ role: input.role })
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", input.userId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  acceptInviteLink: protectedProcedure
    .input(z.object({ token: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { createServiceClient } = await import("@/lib/supabase/service");
      const service = createServiceClient();
      const { data: invite, error: inviteErr } = await service
        .from("workspace_invites")
        .select("workspace_id, role, expires_at, created_by")
        .eq("token", input.token)
        .maybeSingle();
      if (inviteErr || !invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found or expired" });
      const row = invite as { workspace_id: string; role: string; expires_at: string; created_by: string };
      if (new Date(row.expires_at) < new Date()) {
        await service.from("workspace_invites").delete().eq("token", input.token);
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite expired" });
      }
      // Service client has no generated DB types; insert shape is valid at runtime
      // @ts-expect-error - Supabase generic client types insert as never without Database generic
      const { error: insertErr } = await service.from("workspace_members").insert({
        workspace_id: row.workspace_id,
        user_id: ctx.user.id,
        role: row.role,
        invited_by: row.created_by,
      });
      if (insertErr) {
        if (insertErr.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Already a member" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: insertErr.message });
      }
      await service.from("workspace_invites").delete().eq("token", input.token);
      const { data: ws } = await service.from("workspaces").select("slug").eq("id", row.workspace_id).single();
      const slug = (ws as { slug?: string } | null)?.slug ?? row.workspace_id;
      return { workspaceSlug: slug };
    }),

  createInviteLink: protectedProcedure
    .input(workspaceCreateInviteLinkSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const isOwner = ws.owner_id === ctx.user.id;
      const { data: memberRow } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      if (!isOwner && memberRow?.role !== "admin")
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner or admin can create invite links" });
      const expiresInDays = input.expiresInDays ?? 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      const { data: invite, error } = await ctx.supabase
        .from("workspace_invites")
        .insert({
          workspace_id: input.workspaceId,
          role: input.role,
          expires_at: expiresAt.toISOString(),
          created_by: ctx.user.id,
        })
        .select("token")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { token: invite.token, link: `/invite/${invite.token}` };
    }),

  removeMember: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: ws } = await ctx.supabase
        .from("workspaces")
        .select("owner_id")
        .eq("id", input.workspaceId)
        .single();
      if (!ws) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const isOwner = ws.owner_id === ctx.user.id;
      const { data: myMember } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", ctx.user.id)
        .maybeSingle();
      const canRemove = isOwner || myMember?.role === "admin" || input.userId === ctx.user.id;
      if (!canRemove)
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove this member" });
      if (input.userId === ws.owner_id)
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove workspace owner" });
      const { error } = await ctx.supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", input.workspaceId)
        .eq("user_id", input.userId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
