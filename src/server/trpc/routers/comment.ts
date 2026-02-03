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

const anchorSchema = z.object({ from: z.number(), to: z.number() });

export const commentRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        resolved: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase
        .from("documents")
        .select("project_id")
        .eq("id", input.documentId)
        .single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", p.workspace_id)
        .eq("user_id", ctx.user.id)
        .single();
      if (!m && w.owner_id !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });

      let q = ctx.supabase
        .from("document_comments")
        .select("id, document_id, author_id, parent_id, anchor, content_text, resolved_at, created_at, updated_at")
        .eq("document_id", input.documentId)
        .order("created_at", { ascending: true });
      if (input.resolved !== undefined) {
        q = input.resolved ? q.not("resolved_at", "is", null) : q.is("resolved_at", null);
      }
      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  create: protectedProcedure
    .input(
      z.object({
        documentId: z.string().uuid(),
        anchor: anchorSchema,
        contentText: z.string().min(1).max(10000),
        parentId: z.string().uuid().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase
        .from("documents")
        .select("project_id")
        .eq("id", input.documentId)
        .single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      const { data, error } = await ctx.supabase
        .from("document_comments")
        .insert({
          document_id: input.documentId,
          author_id: ctx.user.id,
          parent_id: input.parentId ?? null,
          anchor: input.anchor as unknown as Record<string, unknown>,
          content_text: input.contentText,
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        contentText: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data: comment } = await ctx.supabase
        .from("document_comments")
        .select("author_id")
        .eq("id", input.id)
        .single();
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      if ((comment as { author_id: string }).author_id !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not the author" });
      }
      const { data, error } = await ctx.supabase
        .from("document_comments")
        .update({ content_text: input.contentText })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  resolve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: comment } = await ctx.supabase
        .from("document_comments")
        .select("document_id, author_id")
        .eq("id", input.id)
        .single();
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      const c = comment as { document_id: string; author_id: string };
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", c.document_id).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", p.workspace_id)
        .eq("user_id", ctx.user.id)
        .single();
      const isAuthor = c.author_id === ctx.user.id;
      const isAdmin =
        w.owner_id === ctx.user.id || (m && ["owner", "admin"].includes((m as { role: string }).role));
      if (!isAuthor && !isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      const { data, error } = await ctx.supabase
        .from("document_comments")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  unresolve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: comment } = await ctx.supabase
        .from("document_comments")
        .select("document_id, author_id")
        .eq("id", input.id)
        .single();
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      const c = comment as { document_id: string; author_id: string };
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", c.document_id).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", p.workspace_id)
        .eq("user_id", ctx.user.id)
        .single();
      const isAuthor = c.author_id === ctx.user.id;
      const isAdmin =
        w.owner_id === ctx.user.id || (m && ["owner", "admin"].includes((m as { role: string }).role));
      if (!isAuthor && !isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      const { data, error } = await ctx.supabase
        .from("document_comments")
        .update({ resolved_at: null })
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: comment } = await ctx.supabase
        .from("document_comments")
        .select("document_id, author_id")
        .eq("id", input.id)
        .single();
      if (!comment) throw new TRPCError({ code: "NOT_FOUND", message: "Comment not found" });
      const c = comment as { document_id: string; author_id: string };
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", c.document_id).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", p.workspace_id)
        .eq("user_id", ctx.user.id)
        .single();
      const isAuthor = c.author_id === ctx.user.id;
      const isAdmin =
        w.owner_id === ctx.user.id || (m && ["owner", "admin"].includes((m as { role: string }).role));
      if (!isAuthor && !isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized" });
      const { error } = await ctx.supabase.from("document_comments").delete().eq("id", input.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
