"use client";

import { Modal } from "@/components/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";

const RECENT_DOCS_KEY = "markflow-recent-docs";
const MAX_RECENT = 10;

export type RecentDoc = {
  id: string;
  name: string;
  workspaceSlug: string;
  projectSlug: string;
};

function getRecentDocs(): RecentDoc[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_DOCS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addRecentDoc(doc: RecentDoc) {
  if (typeof window === "undefined") return;
  const list = getRecentDocs().filter((d) => d.id !== doc.id);
  list.unshift(doc);
  const trimmed = list.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_DOCS_KEY, JSON.stringify(trimmed));
}

type QuickSwitcherItem =
  | { type: "doc"; id: string; name: string; workspaceSlug: string; projectSlug: string }
  | { type: "workspace"; id: string; slug: string; name: string };

export function QuickSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: open });
  const recentDocs = useMemo(() => (open ? getRecentDocs() : []), [open]);

  const items = useMemo((): QuickSwitcherItem[] => {
    const result: QuickSwitcherItem[] = [];
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);

    recentDocs.forEach((d) => {
      if (match(d.name))
        result.push({
          type: "doc",
          id: d.id,
          name: d.name,
          workspaceSlug: d.workspaceSlug,
          projectSlug: d.projectSlug,
        });
    });
    workspaces?.forEach((w) => {
      if (match(w.name))
        result.push({ type: "workspace", id: w.id, slug: w.slug, name: w.name });
    });

    return result;
  }, [query, workspaces, recentDocs]);

  const clampedIndex = Math.min(Math.max(0, selectedIndex), Math.max(0, items.length - 1));

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[clampedIndex]) {
        e.preventDefault();
        const item = items[clampedIndex]!;
        if (item.type === "doc") {
          router.push(`/w/${item.workspaceSlug}/p/${item.projectSlug}/doc/${item.id}`);
        } else if (item.type === "workspace") {
          router.push(`/w/${item.slug}`);
        }
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [items, clampedIndex, router, onClose]
  );

  const handleSelect = useCallback(
    (item: QuickSwitcherItem) => {
      if (item.type === "doc") {
        router.push(`/w/${item.workspaceSlug}/p/${item.projectSlug}/doc/${item.id}`);
      } else if (item.type === "workspace") {
        router.push(`/w/${item.slug}`);
      }
      onClose();
    },
    [router, onClose]
  );

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="">
      <div className="min-w-[320px] max-w-[480px]" onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search workspaces, projects, docs…"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          aria-label="Search"
        />
        <div
          ref={listRef}
          className="mt-2 max-h-[60vh] overflow-y-auto rounded border border-border"
          role="listbox"
          aria-label="Results"
        >
          {items.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-text-muted">
              {query ? "No results" : "Type to search"}
            </div>
          ) : (
            items.map((item, i) => (
              <button
                key={item.type === "doc" ? item.id : `${item.type}-${item.id}`}
                type="button"
                role="option"
                aria-selected={i === clampedIndex}
                onClick={() => handleSelect(item)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  i === clampedIndex ? "bg-accent/15 text-text" : "text-text-muted hover:bg-bg hover:text-text"
                }`}
              >
                {item.type === "doc" && <span aria-hidden>📄</span>}
                {item.type === "workspace" && <span aria-hidden>📁</span>}
                <span className="truncate">{item.name}</span>
              </button>
            ))
          )}
        </div>
        <p className="mt-2 text-xs text-text-muted">↑↓ navigate · Enter select · Esc close</p>
      </div>
    </Modal>
  );
}

export function useQuickSwitcher() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
