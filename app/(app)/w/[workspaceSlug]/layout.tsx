"use client";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { Button, Input, Label, Modal } from "@/components/ui";
import { useSetHeaderContent } from "@/contexts/HeaderContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";

function WorkspaceLayoutInner({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const setHeader = useSetHeaderContent();
  const { data: workspace, error, isLoading } = trpc.workspace.getById.useQuery(
    { idOrSlug: workspaceSlug },
    { enabled: !!workspaceSlug }
  );
  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

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
        <aside className="w-56 shrink-0 border-r border-border bg-surface p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Projects
            </span>
            <NewProjectButton workspaceId={workspace.id} />
          </div>
          <ul className="space-y-0.5">
            {(projects ?? []).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/w/${workspace.slug}/p/${p.slug}`}
                  className="block rounded px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex-1 min-w-0 overflow-auto">{children}</div>
      </div>
    </WorkspaceProvider>
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
        className="text-accent hover:underline text-xs font-medium"
      >
        New project
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
