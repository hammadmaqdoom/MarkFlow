"use client";

import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

const PINNED_DOCS_KEY_PREFIX = "docmgmt-pinned-docs-";

export interface DocTreeItem {
  id: string;
  parent_id: string | null;
  type: string;
  name: string;
  path: string;
  visible_in_share?: boolean;
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

function flattenItems(list: DocTreeItem[]): DocTreeItem[] {
  return list.flatMap((i) => [i, ...flattenItems(i.children)]);
}

export function DocumentTree({
  items,
  workspaceSlug,
  projectSlug,
  projectId,
  pendingRenameId = null,
  onClearRenameId,
}: {
  items: DocTreeItem[];
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  pendingRenameId?: string | null;
  onClearRenameId?: () => void;
}) {
  const [pinnedDocIds, setPinnedDocIds] = useState<string[]>(() =>
    getPinnedDocIds(projectId)
  );
  const [renameId, setRenameId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<"root" | string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setPinnedDocIds(getPinnedDocIds(projectId));
  }, [projectId]);

  const activeRenameId = renameId ?? pendingRenameId ?? null;

  useEffect(() => {
    if (pendingRenameId) setRenameId(null);
  }, [pendingRenameId]);

  const pinnedSet = useMemo(() => new Set(pinnedDocIds), [pinnedDocIds]);
  const idToItem = useMemo(() => {
    const map = new Map<string, DocTreeItem>();
    flattenItems(items).forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const getDescendantIdsMemo = useCallback(
    (folderId: string) => {
      const all = flattenItems(items);
      const folder = all.find((i) => i.id === folderId);
      if (!folder || folder.type !== "folder") return new Set<string>();
      const set = new Set<string>();
      function collect(item: DocTreeItem) {
        set.add(item.id);
        item.children.forEach(collect);
      }
      folder.children.forEach(collect);
      return set;
    },
    [items]
  );

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

  const handleClearRename = useCallback(() => {
    setRenameId(null);
    onClearRenameId?.();
  }, [onClearRenameId]);

  const pinnedItems = pinnedDocIds
    .map((id) => idToItem.get(id))
    .filter(Boolean) as DocTreeItem[];

  const utils = trpc.useUtils();
  const updateDoc = trpc.document.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ projectId, includeTree: true });
    },
  });

  const canDrop = useCallback(
    (docId: string, target: "root" | string): boolean => {
      if (target === "root") return true;
      if (docId === target) return false;
      const descendants = getDescendantIdsMemo(target);
      return !descendants.has(docId);
    },
    [getDescendantIdsMemo]
  );

  const rootDropProps = {
    "data-drop-target": "root" as const,
    onDragOver: (e: React.DragEvent) => {
      if (!draggedId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverTarget("root");
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setDragOverTarget(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("application/x-doc-id") || draggedId;
      if (id) {
        updateDoc.mutate({ documentId: id, data: { parentId: null } });
      }
      setDragOverTarget(null);
      setDraggedId(null);
    },
  };

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
                renameId={activeRenameId}
                onRequestRename={setRenameId}
                onClearRename={handleClearRename}
                dragOverTarget={dragOverTarget}
                setDragOverTarget={setDragOverTarget}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
                canDrop={canDrop}
                getDescendantIds={getDescendantIdsMemo}
              />
            ))}
          </ul>
        </div>
      )}
      <ul
        className={`space-y-0.5 border-l border-border pl-2 rounded transition-colors ${dragOverTarget === "root" ? "bg-accent/10 ring-1 ring-accent/30" : ""}`}
        role="tree"
        aria-label="Document hierarchy"
        {...rootDropProps}
      >
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
              renameId={activeRenameId}
              onRequestRename={setRenameId}
              onClearRename={handleClearRename}
              dragOverTarget={dragOverTarget}
              setDragOverTarget={setDragOverTarget}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
              canDrop={canDrop}
              getDescendantIds={getDescendantIdsMemo}
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
  renameId,
  onRequestRename,
  onClearRename,
  dragOverTarget,
  setDragOverTarget,
  draggedId,
  setDraggedId,
  canDrop,
  getDescendantIds,
}: {
  item: DocTreeItem;
  workspaceSlug: string;
  projectSlug: string;
  projectId: string;
  isPinnedForId: (id: string) => boolean;
  onPinToggle: (docId: string) => void;
  renameId: string | null;
  onRequestRename: (id: string) => void;
  onClearRename: () => void;
  dragOverTarget: "root" | string | null;
  setDragOverTarget: (t: "root" | string | null) => void;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  canDrop: (docId: string, target: "root" | string) => boolean;
  getDescendantIds: (folderId: string) => Set<string>;
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
  const updateDoc = trpc.document.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ projectId, includeTree: true });
      onClearRename();
    },
  });
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const isRenaming = renameId === item.id;

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

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

  const handleRenameCommit = (newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== item.name) {
      updateDoc.mutate({ documentId: item.id, data: { name: trimmed } });
    } else {
      onClearRename();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (inputRef.current) inputRef.current.value = item.name;
      onClearRename();
      inputRef.current?.blur();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setDraggedId(item.id);
    e.dataTransfer.setData("application/x-doc-id", item.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.name);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverTarget(null);
  };

  const isDropTarget = isFolder && dragOverTarget === item.id && draggedId && canDrop(draggedId, item.id);
  const visibleInShare = item.visible_in_share !== false;

  const handleVisibleInShareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    updateDoc.mutate({ documentId: item.id, data: { visibleInShare: !visibleInShare } });
  };

  const actionButtons = (
    <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
      <button
        type="button"
        onClick={handleVisibleInShareToggle}
        disabled={updateDoc.isPending}
        className={`rounded p-1 ${visibleInShare ? "text-text-muted hover:bg-surface hover:text-text" : "text-text-muted/60 hover:bg-surface hover:text-amber-600"}`}
        title={visibleInShare ? "Hide from public share" : "Show on public share"}
        aria-label={visibleInShare ? "Hide from public share" : "Show on public share"}
      >
        {visibleInShare ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        )}
      </button>
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

  const fileLabelContent = (
    <>
      <span className="shrink-0 w-4" />
      <span aria-hidden>📄</span>
      <span className="min-w-0 flex-1 break-words" title={item.name}>{item.name}</span>
    </>
  );

  const folderDropHandlers = isFolder
    ? {
        onDragOver: (e: React.DragEvent) => {
          if (!draggedId || draggedId === item.id) return;
          if (!canDrop(draggedId, item.id)) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          setDragOverTarget(item.id);
        },
        onDragLeave: (e: React.DragEvent) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (dragOverTarget === item.id) setDragOverTarget(null);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const id = e.dataTransfer.getData("application/x-doc-id");
          if (id && canDrop(id, item.id)) {
            updateDoc.mutate({ documentId: id, data: { parentId: item.id } });
          }
          setDragOverTarget(null);
          setDraggedId(null);
        },
      }
    : {};

  if (isFolder) {
    return (
      <li
        role="treeitem"
        aria-expanded={expanded}
        aria-label={item.name}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={draggedId === item.id ? "opacity-50" : ""}
      >
        <div
          className={`group flex items-center gap-1 rounded px-2 py-1.5 transition-colors ${isDropTarget ? "bg-accent/15 ring-1 ring-accent/40" : ""}`}
          {...folderDropHandlers}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="shrink-0 w-4 rounded text-center text-sm text-text-muted hover:bg-bg hover:text-text"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "▾" : "▸"}
          </button>
          {isRenaming ? (
            <RenameInput
              ref={inputRef}
              defaultValue={item.name}
              onBlur={(e) => handleRenameCommit(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="min-w-0 flex-1 rounded border border-accent bg-surface px-1 py-0.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
            />
          ) : (
            <span
              className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-left text-sm text-text-muted hover:bg-bg hover:text-text"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRequestRename(item.id);
              }}
            >
              <span aria-hidden>📁</span>
              <span className="break-words" title={item.name}>{item.name}</span>
            </span>
          )}
          {!isRenaming && actionButtons}
        </div>
        {expanded && (
          <ul role="group" className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
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
                  renameId={renameId}
                  onRequestRename={onRequestRename}
                  onClearRename={onClearRename}
                  dragOverTarget={dragOverTarget}
                  setDragOverTarget={setDragOverTarget}
                  draggedId={draggedId}
                  setDraggedId={setDraggedId}
                  canDrop={canDrop}
                  getDescendantIds={getDescendantIds}
                />
              ))}
            {!hasChildren && (
              <li className="py-1 pl-6 text-xs text-text-muted/70 italic" role="none">
                No documents
              </li>
            )}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li
      role="treeitem"
      aria-label={item.name}
      className={`group ${draggedId === item.id ? "opacity-50" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {isRenaming ? (
        <div className="flex items-center gap-1 rounded px-2 py-1.5">
          <span className="shrink-0 w-4" />
          <span aria-hidden>📄</span>
          <RenameInput
            ref={inputRef}
            defaultValue={item.name}
            onBlur={(e) => handleRenameCommit(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 rounded border border-accent bg-surface px-1 py-0.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      ) : (
        <Link
          href={`/w/${workspaceSlug}/p/${projectSlug}/doc/${item.id}`}
          className="flex items-center gap-1 rounded px-2 py-1.5 text-sm text-text-muted hover:bg-bg hover:text-text"
          onDoubleClick={(e) => {
            e.preventDefault();
            onRequestRename(item.id);
          }}
        >
          {fileLabelContent}
          {actionButtons}
        </Link>
      )}
    </li>
  );
}

const RenameInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function RenameInput(props, ref) {
  return <input ref={ref} {...props} />;
});
