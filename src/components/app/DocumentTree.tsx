"use client";

import Link from "next/link";
import { useState } from "react";

export interface DocTreeItem {
  id: string;
  parent_id: string | null;
  type: string;
  name: string;
  path: string;
  children: DocTreeItem[];
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
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <DocTreeNode
          key={item.id}
          item={item}
          workspaceSlug={workspaceSlug}
          projectSlug={projectSlug}
        />
      ))}
    </ul>
  );
}

function DocTreeNode({
  item,
  workspaceSlug,
  projectSlug,
}: {
  item: DocTreeItem;
  workspaceSlug: string;
  projectSlug: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = item.type === "folder";
  const hasChildren = item.children.length > 0;

  if (isFolder) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1.5 w-full rounded px-2 py-1.5 text-left text-sm text-text-muted hover:bg-bg hover:text-text"
        >
          <span className="shrink-0 w-4 text-center">
            {hasChildren ? (expanded ? "▾" : "▸") : ""}
          </span>
          <span aria-hidden>{isFolder ? "📁" : "📄"}</span>
          <span className="truncate">{item.name}</span>
        </button>
        {expanded && hasChildren && (
          <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
            {item.children.map((child) => (
              <DocTreeNode
                key={child.id}
                item={child}
                workspaceSlug={workspaceSlug}
                projectSlug={projectSlug}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/w/${workspaceSlug}/p/${projectSlug}/doc/${item.id}`}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-text-muted hover:bg-bg hover:text-text"
      >
        <span className="shrink-0 w-4" />
        <span aria-hidden>📄</span>
        <span className="truncate">{item.name}</span>
      </Link>
    </li>
  );
}
