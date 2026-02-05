/**
 * Caller interface used by MCP tools – can be backed by tRPC caller (HTTP route)
 * or tRPC proxy client (stdio script).
 */
export type MarkflowMcpCaller = {
  workspace: { list: () => Promise<unknown> };
  project: { list: (x: { workspaceId: string }) => Promise<unknown> };
  document: {
    list: (x: { projectId: string; parentId: string | null }) => Promise<unknown>;
    getById: (x: { documentId: string; includeContent: boolean }) => Promise<unknown>;
    getByPath: (x: { projectId: string; path: string; includeContent: boolean }) => Promise<unknown>;
    updateContent: (x: { documentId: string; contentMd: string }) => Promise<unknown>;
    create: (x: {
      projectId: string;
      parentId: string | null;
      type: "file";
      name: string;
    }) => Promise<{ id: string }>;
  };
};
