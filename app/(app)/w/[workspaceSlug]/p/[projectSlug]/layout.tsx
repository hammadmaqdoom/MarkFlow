"use client";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { Button, Input, Label, Modal } from "@/components/ui";
import { useSetHeaderContent } from "@/contexts/HeaderContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";
import { DocumentTree } from "@/components/app/DocumentTree";

function DocumentsSidebar({
  workspaceSlug,
  projectSlug,
  project,
  tree,
  children,
}: {
  workspaceSlug: string;
  projectSlug: string;
  project: { id: string; name: string; slug: string; workspace_id: string };
  tree: TreeItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const workspace = useWorkspace();
  if (!workspace) return <div className="flex h-full flex-1 min-w-0 overflow-auto">{children}</div>;
  return (
    <div className="flex h-full">
      {collapsed ? (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 w-10 border-r border-border bg-surface flex items-center justify-center hover:bg-bg text-text-muted hover:text-text transition-colors"
          aria-label="Expand documents sidebar"
        >
          <svg className="h-5 w-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      ) : (
        <aside className="no-print w-56 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3 p-4 pb-0">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Documents</span>
            <NewDocFolderButtons projectId={project.id} workspaceSlug={workspaceSlug} projectSlug={projectSlug} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <ExportButton projectId={project.id} projectSlug={projectSlug} workspaceSlug={workspaceSlug} />
            <GitHubSettings
              projectId={project.id}
              projectSlug={projectSlug}
              workspaceSlug={workspaceSlug}
              githubRepo={(project as { github_repo?: string | null }).github_repo ?? null}
              githubBranch={(project as { github_branch?: string | null }).github_branch ?? null}
            />
            <DocumentTree
              items={tree}
              workspaceSlug={workspaceSlug}
              projectSlug={projectSlug}
              projectId={project.id}
            />
          </div>
          <div className="p-2 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-text"
              aria-label="Collapse documents sidebar"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </aside>
      )}
      <div className="flex-1 min-w-0 overflow-auto">{children}</div>
    </div>
  );
}

function ProjectLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const workspace = useWorkspace();
  const setHeader = useSetHeaderContent();
  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const projectMeta = projects?.find((p) => p.slug === projectSlug);
  const { data: project, error, isLoading } = trpc.project.getById.useQuery(
    { projectId: projectMeta?.id ?? "", includeTree: true },
    { enabled: !!projectMeta?.id }
  );

  useEffect(() => {
    setHeader(<Breadcrumb />);
    return () => setHeader(null);
  }, [setHeader]);

  if (!workspace) return null;
  if (!projectMeta) {
    if (projects && projects.length > 0) notFound();
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (error?.data?.code === "NOT_FOUND" || (!isLoading && !project)) {
    notFound();
  }
  if (!project) return null;

  const documents = "documents" in project ? ((project as { documents?: { id: string; parent_id: string | null; type: string; name: string; path: string }[] }).documents ?? []) : [];
  const tree = buildTree(documents);

  return (
    <ProjectProvider
      project={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        workspaceId: project.workspace_id,
      }}
    >
      <DocumentsSidebar
        workspaceSlug={workspaceSlug}
        projectSlug={projectSlug}
        project={project}
        tree={tree}
      >
        {children}
      </DocumentsSidebar>
    </ProjectProvider>
  );
}

function buildTree(
  docs: { id: string; parent_id: string | null; type: string; name: string; path: string }[]
): TreeItem[] {
  const byParent = new Map<string | null, typeof docs>();
  for (const d of docs) {
    const key = d.parent_id;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(d);
  }
  function children(parentId: string | null): TreeItem[] {
    const list = byParent.get(parentId) ?? [];
    return list
      .sort((a, b) => (a.type === "folder" && b.type !== "folder" ? -1 : a.name.localeCompare(b.name)))
      .map((d) => ({
        ...d,
        children: d.type === "folder" ? children(d.id) : [],
      }));
  }
  return children(null);
}

type TreeItem = {
  id: string;
  parent_id: string | null;
  type: string;
  name: string;
  path: string;
  children: TreeItem[];
};

function GitHubSettings({
  projectId,
  projectSlug,
  workspaceSlug,
  githubRepo,
  githubBranch,
}: {
  projectId: string;
  projectSlug: string;
  workspaceSlug: string;
  githubRepo: string | null;
  githubBranch: string | null;
}) {
  const utils = trpc.useUtils();
  const [selectedRepo, setSelectedRepo] = useState(githubRepo ?? "");
  const [selectedBranch, setSelectedBranch] = useState(githubBranch ?? "main");
  const { data: repos, error: reposError } = trpc.github.listRepos.useQuery(undefined, { retry: false });
  const { data: branches } = trpc.github.listBranches.useQuery(
    { repo: selectedRepo },
    { enabled: !!selectedRepo }
  );
  const connectGitHub = trpc.project.connectGitHub.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate();
    },
  });
  const disconnectGitHub = trpc.project.disconnectGitHub.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate();
      setSelectedRepo("");
      setSelectedBranch("main");
    },
  });
  const [syncing, setSyncing] = useState(false);
  const connectUrl = `/api/auth/github/connect?next=${encodeURIComponent(`/w/${workspaceSlug}/p/${projectSlug}`)}`;

  if (githubRepo) {
    return (
      <div className="mb-3 rounded border border-border p-2">
        <p className="text-xs font-medium text-text-muted mb-1">GitHub</p>
        <p className="text-xs text-text truncate" title={githubRepo}>
          {githubRepo} @ {githubBranch ?? "main"}
        </p>
        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={async () => {
              setSyncing(true);
              try {
                await fetch("/api/v1/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ projectId }),
                  credentials: "same-origin",
                });
              } finally {
                setSyncing(false);
              }
            }}
            disabled={syncing}
            className="flex-1 rounded px-2 py-1 text-xs font-medium text-text hover:bg-bg disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={() => disconnectGitHub.mutate({ projectId })}
            disabled={disconnectGitHub.isPending}
            className="rounded px-2 py-1 text-xs font-medium text-text-muted hover:bg-bg"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  // When not connected, Connect GitHub is shown on the project intro page (default home).
  if (reposError?.data?.code === "PRECONDITION_FAILED") return null;
  if (!repos?.length) return null;

  return (
    <div className="mb-3 rounded border border-border p-2">
      <p className="text-xs font-medium text-text-muted mb-1">GitHub</p>
      <select
        value={selectedRepo}
        onChange={(e) => {
          const repo = e.target.value;
          setSelectedRepo(repo);
          const r = repos.find((x) => x.fullName === repo);
          setSelectedBranch(r?.defaultBranch ?? "main");
        }}
        className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-text"
      >
        <option value="">Select repo</option>
        {repos.map((r) => (
          <option key={r.fullName} value={r.fullName}>
            {r.fullName}
          </option>
        ))}
      </select>
      {selectedRepo && (
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full mt-1 rounded border border-border bg-surface px-2 py-1 text-xs text-text"
        >
          {(branches ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => connectGitHub.mutate({ projectId, githubRepo: selectedRepo, githubBranch: selectedBranch })}
        disabled={!selectedRepo || connectGitHub.isPending}
        className="mt-2 w-full rounded px-2 py-1 text-xs font-medium text-accent hover:bg-bg disabled:opacity-50"
      >
        {connectGitHub.isPending ? "Linking…" : "Link repo"}
      </button>
    </div>
  );
}

function ExportButton({
  projectId,
  workspaceSlug,
  projectSlug,
}: {
  projectId: string;
  workspaceSlug: string;
  projectSlug: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Export failed");
        return;
      }
      const jobId = data.jobId as string;
      const zipRes = await fetch(`/api/v1/export/${jobId}`, { credentials: "same-origin" });
      if (!zipRes.ok) {
        setError("Download failed");
        return;
      }
      const blob = await zipRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `markflow-export-${projectSlug}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-text hover:bg-bg disabled:opacity-50"
      >
        {exporting ? "Exporting…" : "Export for AI"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function NewDocFolderButtons({
  projectId,
  workspaceSlug,
  projectSlug,
}: {
  projectId: string;
  workspaceSlug: string;
  projectSlug: string;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: templates } = trpc.template.list.useQuery();
  const createDoc = trpc.document.create.useMutation({
    onSuccess: (data) => {
      utils.project.getById.invalidate();
      router.push(`/w/${workspaceSlug}/p/${projectSlug}/doc/${data.id}`);
    },
  });
  const createFolder = trpc.document.create.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate();
      setFolderOpen(false);
      setFolderName("");
    },
  });
  const [docOpen, setDocOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [docName, setDocName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [selectedTemplateSlug, setSelectedTemplateSlug] = useState<string>("");

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => setDocOpen(true)}
        className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-accent"
        title="New doc"
        aria-label="New doc"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setFolderOpen(true)}
        className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-accent"
        title="New folder"
        aria-label="New folder"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </button>
      <Modal open={docOpen} onClose={() => setDocOpen(false)} title="New document">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDoc.mutate({
              projectId,
              type: "file",
              name: docName || "Untitled",
              templateSlug: selectedTemplateSlug || undefined,
            });
            setDocOpen(false);
            setDocName("");
            setSelectedTemplateSlug("");
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="doc-name">Name</Label>
            <Input
              id="doc-name"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Untitled.md"
            />
          </div>
          {templates && templates.length > 0 && (
            <div>
              <Label>Template (optional)</Label>
              <select
                value={selectedTemplateSlug}
                onChange={(e) => setSelectedTemplateSlug(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.slug} value={t.slug}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDocOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDoc.isPending}>
              {createDoc.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={folderOpen} onClose={() => setFolderOpen(false)} title="New folder">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createFolder.mutate({ projectId, type: "folder", name: folderName || "New folder" });
          }}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="folder-name">Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="New folder"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createFolder.isPending}>
              {createFolder.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <ProjectLayoutInner>{children}</ProjectLayoutInner>;
}
