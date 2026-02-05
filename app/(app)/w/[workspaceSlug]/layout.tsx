"use client";

const PINNED_PROJECTS_KEY = "docmgmt-pinned-projects";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { Button, Input, Label, Modal } from "@/components/ui";
import { useSetHeaderContent } from "@/contexts/HeaderContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";

function WorkspaceLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceSlug = params.workspaceSlug as string;
  const setHeader = useSetHeaderContent();
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  const isInsideProject = pathname?.includes("/p/") ?? false;

  useEffect(() => {
    if (isInsideProject) setProjectsCollapsed(true);
  }, [isInsideProject]);
  const { data: workspace, error, isLoading } = trpc.workspace.getById.useQuery(
    { idOrSlug: workspaceSlug },
    { enabled: !!workspaceSlug }
  );
  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const [pinnedProjectIds, setPinnedProjectIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(PINNED_PROJECTS_KEY) ?? "[]");
    } catch {
      return [];
    }
  });
  const sortedProjects = [...(projects ?? [])].sort((a, b) => {
    const aPin = pinnedProjectIds.indexOf(a.id);
    const bPin = pinnedProjectIds.indexOf(b.id);
    if (aPin === -1 && bPin === -1) return 0;
    if (aPin === -1) return 1;
    if (bPin === -1) return -1;
    return aPin - bPin;
  });
  const handlePinProjectToggle = (projectId: string) => {
    setPinnedProjectIds((prev) => {
      const next = prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId];
      try {
        localStorage.setItem(PINNED_PROJECTS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    setHeader(<Breadcrumb />);
    return () => setHeader(null);
  }, [setHeader]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (error?.data?.code === "NOT_FOUND" || (!isLoading && !workspace)) {
    notFound();
  }
  if (!workspace) return null;

  return (
    <WorkspaceProvider
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }}
    >
      <div className="flex h-full">
        {projectsCollapsed ? (
          <button
            type="button"
            onClick={() => setProjectsCollapsed(false)}
            className="no-print shrink-0 w-10 border-r border-border bg-surface flex items-center justify-center hover:bg-bg text-text-muted hover:text-text transition-colors"
            aria-label="Expand projects sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <aside className="no-print w-56 shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 p-4 pb-0">
              <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Projects
              </span>
              <div className="flex items-center gap-1">
                <NewProjectButton workspaceId={workspace.id} />
                <Link
                  href={`/w/${workspace.slug}/settings`}
                  className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-text"
                  title="Workspace settings"
                  aria-label="Workspace settings"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <ul className="space-y-0.5">
                {sortedProjects.map((p) => (
                  <ProjectSidebarItem
                    key={p.id}
                    project={p}
                    workspaceSlug={workspace.slug}
                    workspaceId={workspace.id}
                    isPinned={pinnedProjectIds.includes(p.id)}
                    onPinToggle={handlePinProjectToggle}
                  />
                ))}
              </ul>
            </div>
            <div className="p-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setProjectsCollapsed(true)}
                className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-text"
                aria-label="Collapse projects sidebar"
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
    </WorkspaceProvider>
  );
}

function ProjectSidebarItem({
  project,
  workspaceSlug,
  workspaceId,
  isPinned,
  onPinToggle,
}: {
  project: { id: string; name: string; slug: string };
  workspaceSlug: string;
  workspaceId: string;
  isPinned: boolean;
  onPinToggle: (projectId: string) => void;
}) {
  const params = useParams();
  const router = useRouter();
  const utils = trpc.useUtils();
  const currentProjectSlug = params.projectSlug as string | undefined;
  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      if (currentProjectSlug === project.slug) {
        router.push(`/w/${workspaceSlug}`);
      }
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    deleteProject.mutate({ projectId: project.id });
  };

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPinToggle(project.id);
  };

  return (
    <li className="group relative">
      <Link
        href={`/w/${workspaceSlug}/p/${project.slug}`}
        className="flex items-center gap-1 rounded px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text"
      >
        <span className="min-w-0 flex-1 truncate">{project.name}</span>
        <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={handlePin}
            className="rounded p-1 text-text-muted hover:bg-surface hover:text-text"
            title={isPinned ? "Unpin" : "Pin to top"}
            aria-label={isPinned ? "Unpin" : "Pin to top"}
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v14l-7-3.5L5 19V5z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteProject.isPending}
            className="rounded p-1 text-text-muted hover:bg-destructive/10 hover:text-destructive"
            title="Delete project"
            aria-label="Delete project"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </span>
      </Link>
    </li>
  );
}

function NewProjectButton({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const utils = trpc.useUtils();
  const create = trpc.project.create.useMutation({
    onSuccess: (data) => {
      utils.project.list.invalidate();
      router.push(`/w/${workspaceSlug}/p/${data.slug}`);
    },
  });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded p-1.5 text-text-muted hover:bg-bg hover:text-accent"
        title="New project"
        aria-label="New project"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="New project"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ workspaceId, name: name || "Untitled project" });
              setOpen(false);
              setName("");
            }}
            className="space-y-3"
          >
            <div>
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Untitled project"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
  );
}
