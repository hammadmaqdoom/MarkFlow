import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  documentCreateSchema,
  documentUpdateContentSchema,
  documentUpdateSchema,
} from "@/server/api/schemas/document";
import { pathFromParentAndName, normalizePath } from "@/server/lib/path";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function assertEditorProject(ctx: { supabase: Context["supabase"]; user: { id: string } }, projectId: string) {
  const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", projectId).single();
  if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
  if (w?.owner_id === ctx.user.id) return;
  const { data: m } = await ctx.supabase.from("workspace_members").select("role").eq("workspace_id", p.workspace_id).eq("user_id", ctx.user.id).single();
  if (m?.role && ["owner", "admin", "editor"].includes(m.role)) return;
  throw new TRPCError({ code: "FORBIDDEN", message: "Editor or above required" });
}

export const documentRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), parentId: z.string().uuid().optional().nullable() }))
    .query(async ({ ctx, input }) => {
      let q = ctx.supabase
        .from("documents")
        .select("id, project_id, parent_id, type, name, path, template_slug, created_at, updated_at")
        .eq("project_id", input.projectId)
        .order("type")
        .order("name");
      if (input.parentId === undefined || input.parentId === null) {
        q = q.is("parent_id", null);
      } else {
        q = q.eq("parent_id", input.parentId);
      }
      const { data, error } = await q;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  create: protectedProcedure
    .input(documentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEditorProject(ctx, input.projectId);
      let parentPath: string | null = null;
      if (input.parentId) {
        const { data: parent } = await ctx.supabase.from("documents").select("path").eq("id", input.parentId).single();
        if (!parent) throw new TRPCError({ code: "NOT_FOUND", message: "Parent not found" });
        parentPath = parent.path;
      }
      const path = pathFromParentAndName(parentPath, input.name);
      const { data, error } = await ctx.supabase
        .from("documents")
        .insert({
          project_id: input.projectId,
          parent_id: input.parentId ?? null,
          type: input.type,
          name: input.name,
          path,
          template_slug: input.templateSlug ?? null,
          ...(input.type === "folder" ? {} : { content_yjs: null, content_md: null }),
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505") throw new TRPCError({ code: "CONFLICT", message: "Path already exists" });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
      return data;
    }),

  getById: protectedProcedure
    .input(z.object({ documentId: z.string().uuid(), includeContent: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const cols = input.includeContent
        ? "id, project_id, parent_id, type, name, path, content_yjs, content_md, template_slug, created_at, updated_at"
        : "id, project_id, parent_id, type, name, path, template_slug, created_at, updated_at, content_md";
      const { data, error } = await ctx.supabase
        .from("documents")
        .select(cols)
        .eq("id", input.documentId)
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const row = data as unknown as Record<string, unknown>;
      if (input.includeContent && row.content_yjs) {
        return { ...row, content_yjs_base64: Buffer.from(row.content_yjs as Buffer).toString("base64") };
      }
      return data;
    }),

  getByPath: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), path: z.string().min(1), includeContent: z.boolean().optional() }))
    .query(async ({ ctx, input }) => {
      const path = normalizePath(input.path);
      const cols = input.includeContent
        ? "id, project_id, parent_id, type, name, path, content_yjs, content_md, template_slug, created_at, updated_at"
        : "id, project_id, parent_id, type, name, path, template_slug, created_at, updated_at, content_md";
      const { data, error } = await ctx.supabase
        .from("documents")
        .select(cols)
        .eq("project_id", input.projectId)
        .eq("path", path)
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const row = data as unknown as Record<string, unknown>;
      if (input.includeContent && row.content_yjs) {
        return { ...row, content_yjs_base64: Buffer.from(row.content_yjs as Buffer).toString("base64") };
      }
      return data;
    }),

  update: protectedProcedure
    .input(z.object({ documentId: z.string().uuid(), data: documentUpdateSchema }))
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      const update: Record<string, unknown> = {};
      if (input.data.name !== undefined) update.name = input.data.name;
      if (input.data.path !== undefined) update.path = normalizePath(input.data.path);
      if (input.data.parentId !== undefined) update.parent_id = input.data.parentId;
      const { data, error } = await ctx.supabase
        .from("documents")
        .update(update)
        .eq("id", input.documentId)
        .select()
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data;
    }),

  updateContent: protectedProcedure
    .input(documentUpdateContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id, type").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (doc.type === "folder") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot set content on folder" });
      await assertEditorProject(ctx, doc.project_id);
      const update: Record<string, unknown> = {};
      if (input.contentYjs !== undefined) {
        update.content_yjs = Buffer.from(input.contentYjs, "base64");
      }
      if (input.contentMd !== undefined) update.content_md = input.contentMd;
      const { data, error } = await ctx.supabase
        .from("documents")
        .update(update)
        .eq("id", input.documentId)
        .select("id, updated_at")
        .single();
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      if (input.contentYjs !== undefined || input.contentMd !== undefined) {
        const { data: lastVer } = await ctx.supabase
          .from("document_versions")
          .select("version_number")
          .eq("document_id", input.documentId)
          .order("version_number", { ascending: false })
          .limit(1)
          .single();
        const nextNum = (lastVer?.version_number ?? 0) + 1;
        await ctx.supabase.from("document_versions").insert({
          document_id: input.documentId,
          content_yjs: input.contentYjs !== undefined ? Buffer.from(input.contentYjs, "base64") : null,
          content_md: input.contentMd ?? null,
          version_number: nextNum,
          created_by: ctx.user.id,
        });
      }
      return data;
    }),

  listVersions: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase.from("workspace_members").select("role").eq("workspace_id", p.workspace_id).eq("user_id", ctx.user.id).single();
      if (!m && w.owner_id !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      const { data, error } = await ctx.supabase
        .from("document_versions")
        .select("id, version_number, created_at, created_by")
        .eq("document_id", input.documentId)
        .order("version_number", { ascending: false });
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return data ?? [];
    }),

  getVersion: protectedProcedure
    .input(z.object({ documentId: z.string().uuid(), versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const { data: p } = await ctx.supabase.from("projects").select("workspace_id").eq("id", doc.project_id).single();
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      const { data: w } = await ctx.supabase.from("workspaces").select("owner_id").eq("id", p.workspace_id).single();
      if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      const { data: m } = await ctx.supabase.from("workspace_members").select("role").eq("workspace_id", p.workspace_id).eq("user_id", ctx.user.id).single();
      if (!m && w.owner_id !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member" });
      const { data, error } = await ctx.supabase
        .from("document_versions")
        .select("id, version_number, content_md, content_yjs, created_at, created_by")
        .eq("document_id", input.documentId)
        .eq("id", input.versionId)
        .single();
      if (error || !data) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      const row = data as unknown as Record<string, unknown>;
      return {
        id: row.id,
        version_number: row.version_number,
        content_md: row.content_md,
        content_yjs_base64:
          row.content_yjs != null
            ? Buffer.from(row.content_yjs as Buffer).toString("base64")
            : null,
        created_at: row.created_at,
        created_by: row.created_by,
      };
    }),

  delete: protectedProcedure
    .input(z.object({ documentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { data: doc } = await ctx.supabase.from("documents").select("project_id").eq("id", input.documentId).single();
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      await assertEditorProject(ctx, doc.project_id);
      const { error } = await ctx.supabase.from("documents").delete().eq("id", input.documentId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { ok: true };
    }),
});
