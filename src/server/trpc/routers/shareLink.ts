import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function assertEditorProject(
  ctx: { supabase: Context["supabase"]; user: { id: string } },
  projectId: string
) {
  const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
  if (w?.owner_id === ctx.user.id) return;
  const { data: m } = await ctx.supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", p.workspace_id)
    .eq("user_id", ctx.user.id)
    .single();
  if (m?.role && ["owner", "admin", "editor"].includes(m.role)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Editor or above required" });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("base64")}:${hash.toString("base64")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltB64, hashB64] = stored.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = Buffer.from(saltB64, "base64");
  const hash = scryptSync(password, salt, 64);
  const storedHash = Buffer.from(hashB64, "base64");
  return hash.length === storedHash.length && timingSafeEqual(hash, storedHash);
}

export const shareLinkRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        scope: z.enum(["public", "password"]),
        password: z.string().min(1).optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase
        .from("documents")
        .select("project_id, type")
        .eq("id", input.documentId)
        .single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      if (input.scope === "password" && !input.password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password required for password-protected links" });
      }
      const token = randomBytes(32).toString("hex");
      const { data, error } = await ctx.supabase
        .from("share_links")
        .insert({
          document_id: input.documentId,
          token,
          scope: input.scope,
          password_hash: input.scope === "password" && input.password ? hashPassword(input.password) : null,
          expires_at: input.expiresAt ?? null,
          created_by: ctx.user.id,
        })
        .select("id, token, scope, expires_at, created_at")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  list: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      const { data, error } = await ctx.supabase
        .from("share_links")
        .select("id, token, scope, expires_at, created_at")
        .eq("document_id", input.documentId)
        .order("created_at", { ascending: false });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: link } = await ctx.supabase
        .from("share_links")
        .select("document_id")
        .eq("id", input.id)
        .single();
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", link.document_id).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      const { error } = await ctx.supabase.from("share_links").delete().eq("id", input.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),

  createProject: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        scope: z.enum(["public", "password"]),
        password: z.string().min(1).optional(),
        expiresAt: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      if (input.scope === "password" && !input.password) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password required for password-protected links" });
      }
      const token = randomBytes(32).toString("hex");
      const { data, error } = await ctx.supabase
        .from("project_share_links")
        .insert({
          project_id: input.projectId,
          token,
          scope: input.scope,
          password_hash: input.scope === "password" && input.password ? hashPassword(input.password) : null,
          expires_at: input.expiresAt ?? null,
          created_by: ctx.user.id,
        })
        .select("id, token, scope, expires_at, created_at")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  listProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      const { data, error } = await ctx.supabase
        .from("project_share_links")
        .select("id, token, scope, expires_at, created_at")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  revokeProject: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: link } = await ctx.supabase
        .from("project_share_links")
        .select("project_id")
        .eq("id", input.id)
        .single();
      if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Share link not found" });
      await assertEditorProject(ctx, link.project_id);
      const { error } = await ctx.supabase.from("project_share_links").delete().eq("id", input.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});

export { verifyPassword };
