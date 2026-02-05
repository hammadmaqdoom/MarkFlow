import { z } from "zod";
import type { MarkflowMcpCaller } from "./caller-type";

export const MCP_INSTRUCTIONS =
  "Markflow MCP: list workspaces and projects, list/read/write documents. Use list_workspaces first, then list_projects(workspaceId), then list_documents(projectId) or read_document/document paths. Write with write_document(documentId, contentMd) or create_document(projectId, name, contentMd).";

type McpServerLike = {
  tool(
    name: string,
    description: string,
    paramsSchema: object,
    cb: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: "text"; text: string }> }>
  ): void;
};

export function registerMarkflowTools(server: McpServerLike, caller: MarkflowMcpCaller): void {
  server.tool(
    "list_workspaces",
    "List all workspaces you have access to. Use the returned workspace id for list_projects.",
    {},
    async () => {
      const workspaces = await caller.workspace.list();
      return { content: [{ type: "text" as const, text: JSON.stringify(workspaces, null, 2) }] };
    }
  );

  server.tool(
    "list_projects",
    "List projects in a workspace. Requires workspaceId from list_workspaces.",
    { workspaceId: z.string().uuid().describe("Workspace UUID from list_workspaces") },
    async ({ workspaceId }: { workspaceId: string }) => {
      const projects = await caller.project.list({ workspaceId });
      return { content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }] };
    }
  );

  server.tool(
    "list_documents",
    "List documents and folders in a project. Use parentId from a folder to list its children, or omit for root.",
    {
      projectId: z.string().uuid().describe("Project UUID from list_projects"),
      parentId: z.string().uuid().optional().describe("Optional folder UUID to list children"),
    },
    async ({ projectId, parentId }: { projectId: string; parentId?: string }) => {
      const docs = await caller.document.list({
        projectId,
        parentId: parentId ?? null,
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(docs, null, 2) }] };
    }
  );

  server.tool(
    "read_document",
    "Read a document by ID. Returns metadata and content_md (markdown). Use document IDs from list_documents.",
    { documentId: z.string().uuid().describe("Document UUID") },
    async ({ documentId }: { documentId: string }) => {
      const doc = await caller.document.getById({ documentId, includeContent: true });
      const { content_yjs_base64: _, ...rest } = (doc ?? {}) as Record<string, unknown> & { content_yjs_base64?: string };
      return { content: [{ type: "text" as const, text: JSON.stringify(rest, null, 2) }] };
    }
  );

  server.tool(
    "read_document_by_path",
    "Read a document by project ID and path (e.g. '/PRD' or '/docs/api'). Returns metadata and content_md.",
    {
      projectId: z.string().uuid(),
      path: z.string().min(1).describe("Document path, e.g. /PRD or /docs/api"),
    },
    async ({ projectId, path }: { projectId: string; path: string }) => {
      const doc = await caller.document.getByPath({ projectId, path, includeContent: true });
      const { content_yjs_base64: __, ...rest } = (doc ?? {}) as Record<string, unknown> & { content_yjs_base64?: string };
      return { content: [{ type: "text" as const, text: JSON.stringify(rest, null, 2) }] };
    }
  );

  server.tool(
    "write_document",
    "Update a document's markdown content. Use for editing existing docs.",
    {
      documentId: z.string().uuid(),
      contentMd: z.string().describe("Full markdown content for the document"),
    },
    async ({ documentId, contentMd }: { documentId: string; contentMd: string }) => {
      const result = await caller.document.updateContent({ documentId, contentMd });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "create_document",
    "Create a new document (file) in a project. Optionally under parentId (folder).",
    {
      projectId: z.string().uuid(),
      name: z.string().min(1).describe("Document name, e.g. 'API Overview'"),
      parentId: z.string().uuid().optional(),
      contentMd: z.string().optional().describe("Initial markdown content"),
    },
    async ({
      projectId,
      name,
      parentId,
      contentMd,
    }: {
      projectId: string;
      name: string;
      parentId?: string;
      contentMd?: string;
    }) => {
      const doc = await caller.document.create({
        projectId,
        parentId: parentId ?? null,
        type: "file",
        name,
      });
      if (contentMd) {
        await caller.document.updateContent({ documentId: doc.id, contentMd });
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(doc, null, 2) }] };
    }
  );
}
