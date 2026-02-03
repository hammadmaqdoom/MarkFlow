"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProject } from "@/contexts/ProjectContext";
import { trpc } from "@/trpc/client";
import { Button, Input, Label, Modal } from "@/components/ui";

export interface BreadcrumbProps {
  documentName?: string | null;
  documentId?: string | null;
}

const sep = <span className="mx-1.5 text-text-muted">/</span>;

function WorkspaceDropdown() {
  const pathname = usePathname();
  const router = useRouter();
  const workspaceFromContext = useWorkspace();
  const { data: workspaces, refetch: refetchWorkspaces } = trpc.workspace.list.useQuery();
  const [open, setOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const workspaceSlugFromPath = pathname.startsWith("/w/") ? pathname.split("/")[2] : null;
  const currentWorkspace =
    workspaceFromContext ?? (workspaceSlugFromPath ? workspaces?.find((w) => w.slug === workspaceSlugFromPath) : null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const label = currentWorkspace?.name ?? "Select workspace";

  return (
    <>
      <div className="relative inline-block" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-text-muted hover:bg-bg hover:text-text min-w-0 max-w-[12rem]"
          aria-expanded={open}
          aria-haspopup="true"
        >
          <span className="truncate">{label}</span>
          <svg
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div
            className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-surface py-1 shadow-lg"
            role="menu"
          >
            {workspaces?.length
              ? workspaces.map((w) => (
                  <Link
                    key={w.id}
                    href={`/w/${w.slug}`}
                    className={`block px-3 py-2 text-sm hover:bg-bg ${
                      currentWorkspace?.slug === w.slug ? "bg-bg font-medium text-text" : "text-text-muted"
                    }`}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    {w.name}
                  </Link>
                ))
              : null}
            <div className="my-1 border-t border-border" role="separator" />
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-muted hover:bg-bg hover:text-text"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setAddModalOpen(true);
              }}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-bg text-xs font-medium text-text-muted">
                +
              </span>
              Add workspace
            </button>
          </div>
        )}
      </div>
      <AddWorkspaceModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={() => {
          refetchWorkspaces();
          setAddModalOpen(false);
        }}
        router={router}
      />
    </>
  );
}

function AddWorkspaceModal({
  open,
  onClose,
  onSuccess,
  router,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const utils = trpc.useUtils();
  const create = trpc.workspace.create.useMutation({
    onSuccess: (data) => {
      utils.workspace.list.invalidate();
      onSuccess();
      router.push(`/w/${data.slug}`);
    },
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setSlug("");
    }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Add workspace">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate({ name: name || "My Workspace", slug: slug || undefined });
        }}
      >
        <div>
          <Label htmlFor="add-workspace-name">Workspace name</Label>
          <Input
            id="add-workspace-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
            }}
            placeholder="My Workspace"
          />
        </div>
        <div>
          <Label htmlFor="add-workspace-slug">URL slug (optional)</Label>
          <Input
            id="add-workspace-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-workspace"
          />
        </div>
        {create.isError && (
          <p className="text-sm text-red-600" role="alert">
            {create.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Breadcrumb({ documentName, documentId }: BreadcrumbProps) {
  const workspace = useWorkspace();
  const project = useProject();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm min-w-0">
      <WorkspaceDropdown />
      {project && (
        <>
          {sep}
          <Link
            href={`/w/${workspace?.slug ?? ""}/p/${project.slug}`}
            className="text-text-muted hover:text-text truncate max-w-[8rem]"
          >
            {project.name}
          </Link>
        </>
      )}
      {documentId && (
        <>
          {sep}
          <Link
            href={`/w/${workspace?.slug ?? ""}/p/${project?.slug ?? ""}/doc/${documentId}`}
            className="text-text truncate max-w-[12rem] font-medium"
          >
            {documentName ?? "Document"}
          </Link>
        </>
      )}
    </nav>
  );
}
