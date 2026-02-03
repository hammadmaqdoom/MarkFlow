"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/trpc/client";

const PINNED_DOCS_KEY_PREFIX = "docmgmt-pinned-docs-";

export interface DocTreeItem {
  id: string;
  parent_id: string | null;
  type: string;
  name: string;
  path: string;
  children: DocTreeItem[];
}

function getPinnedDocIds(projectId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(
      localStorage.getItem(PINNED_DOCS_KEY_PREFIX + projectId) ?? "[]"
    );
  } catch {
    return [];
  }
}

export function DocumentTree({
  items,
  workspaceSlug,
  projectSlug,
  projectId,
}: {
  items: DocTreeItem[];
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
}) {
  const [pinnedDocIds, setPinnedDocIds] = useState<string[]>(() =>
    getPinnedDocIds(projectId)
  );
  useEffect(() => {
    setPinnedDocIds(getPinnedDocIds(projectId));
  }, [projectId]);
  const pinnedSet = useMemo(() => new Set(pinnedDocIds), [pinnedDocIds]);
  const flattenItems = (list: DocTreeItem[]): DocTreeItem[] =>
    list.flatMap((i) => [i, ...flattenItems(i.children)]);
  const idToItem = useMemo(() => {
    const map = new Map<string, DocTreeItem>();
    flattenItems(items).forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const handlePinToggle = (docId: string) => {
    setPinnedDocIds((prev) => {
      const next = prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId];
      try {
        localStorage.setItem(
          PINNED_DOCS_KEY_PREFIX + projectId,
          JSON.stringify(next)
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const pinnedItems = pinnedDocIds
    .map((id) => idToItem.get(id))
    .filter(Boolean) as DocTreeItem[];

  return (
    <>
      {pinnedItems.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Pinned
          </span>
          <ul className="mt-1 space-y-0.5">
            {pinnedItems.map((item) => (
              <DocTreeNode
                key={item.id}
                item={item}
                workspaceSlug={workspaceSlug}
                projectSlug={projectSlug}
                projectId={projectId}
                isPinnedForId={(id) => pinnedSet.has(id)}
                onPinToggle={handlePinToggle}
              />
            ))}
          </ul>
        </div>
      )}
      <ul className="space-y-0.5">
        {items
          .filter((item) => !pinnedSet.has(item.id))
          .map((item) => (
            <DocTreeNode
              key={item.id}
              item={item}
              workspaceSlug={workspaceSlug}
              projectSlug={projectSlug}
              projectId={projectId}
              isPinnedForId={(id) => pinnedSet.has(id)}
              onPinToggle={handlePinToggle}
            />
          ))}
      </ul>
    </>
  );
}

function DocTreeNode({
  item,
  workspaceSlug,
  projectSlug,
  projectId,
  isPinnedForId,
  onPinToggle,
}: {
  item: DocTreeItem;
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  isPinnedForId: (id: string) => boolean;
  onPinToggle: (docId: string) => void;
}) {
  const isPinned = isPinnedForId(item.id);
  const [expanded, setExpanded] = useState(true);
  const isFolder = item.type === "folder";
  const hasChildren = item.children.length > 0;
  const utils = trpc.useUtils();
  const deleteDoc = trpc.document.delete.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ projectId, includeTree: true });
    },
  });
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete ${isFolder ? "folder" : "document"} "${item.name}"?${
          isFolder && hasChildren ? " This will remove all contents." : ""
        }`
      )
    )
      return;
    deleteDoc.mutate(
      { documentId: item.id },
      {
        onSuccess: () => {
          const currentPath = window.location.pathname;
          if (currentPath.includes(`/doc/${item.id}`)) {
            router.push(`/w/${workspaceSlug}/p/${projectSlug}`);
          }
        },
      }
    );
  };

  const handlePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPinToggle(item.id);
  };

  const actionButtons = (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        onClick={handlePin}
        className="rounded p-1 text-text-muted hover:bg-surface hover:text-text"
        title={isPinned ? "Unpin" : "Pin"}
        aria-label={isPinned ? "Unpin" : "Pin"}
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
        disabled={deleteDoc.isPending}
        className="rounded p-1 text-text-muted hover:bg-destructive/10 hover:text-destructive"
        title={isFolder ? "Delete folder" : "Delete document"}
        aria-label={isFolder ? "Delete folder" : "Delete document"}
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
  );

  if (isFolder) {
    return (
      <li>
        <div className="group flex items-center gap-1 rounded px-2 py-1.5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left text-sm text-text-muted hover:bg-bg hover:text-text"
          >
            <span className="shrink-0 w-4 text-center">
              {hasChildren ? (expanded ? "▾" : "▸") : ""}
            </span>
            <span aria-hidden>📁</span>
            <span className="truncate">{item.name}</span>
          </button>
          {actionButtons}
        </div>
        {expanded && hasChildren && (
          <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.children
              .filter((child) => !isPinnedForId(child.id))
              .map((child) => (
                <DocTreeNode
                  key={child.id}
                  item={child}
                  workspaceSlug={workspaceSlug}
                  projectSlug={projectSlug}
                  projectId={projectId}
                  isPinnedForId={isPinnedForId}
                  onPinToggle={onPinToggle}
                />
              ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li className="group">
      <Link
        href={`/w/${workspaceSlug}/p/${projectSlug}/doc/${item.id}`}
        className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-text-muted hover:bg-bg hover:text-text"
      >
        <span className="shrink-0 w-4" />
        <span aria-hidden>📄</span>
        <span className="min-w-0 flex-1 truncate">{item.name}</span>
        {actionButtons}
      </Link>
    </li>
  );
}
