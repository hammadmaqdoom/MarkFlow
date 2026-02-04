"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import StarterKit from "@tiptap/starter-kit";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { lowlight } from "lowlight";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm as turndownGfm } from "turndown-plugin-gfm";
import { trpc } from "@/trpc/client";

import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

const PARTYKIT_URL = typeof process.env.NEXT_PUBLIC_PARTYKIT_URL === "string" ? process.env.NEXT_PUBLIC_PARTYKIT_URL : undefined;

function colorFromUserId(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h << 5) - h + userId.charCodeAt(i);
  const hue = Math.abs(h % 360);
  return `hsl(${hue}, 65%, 50%)`;
}

const DEBOUNCE_MS = 1500;
const EDITOR_PREFERENCE_KEY = "markflow-editor-preference";

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const turndown = new TurndownService({ headingStyle: "atx" });
turndown.use(turndownGfm);
marked.setOptions({ gfm: true });

function countTaskItems(md: string): { done: number; total: number } {
  const unchecked = (md.match(/^\s*-\s*\[\s\]/gm) ?? []).length;
  const checked = (md.match(/^\s*-\s*\[x\]/gim) ?? []).length;
  return { done: checked, total: unchecked + checked };
}

type EditorMode = "wysiwyg" | "markdown";

export interface DocumentEditorHandle {
  save: () => void;
}

export const DocumentEditor = forwardRef<DocumentEditorHandle, {
  documentId: string;
  initialYjsBase64: string | null;
  initialMd: string | null;
  templateSlug?: string | null;
  restoreContentMd?: string | null;
  onRestoreApplied?: () => void;
  onAddComment?: (anchor: { from: number; to: number }) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
}>(function DocumentEditor({
  documentId,
  initialYjsBase64,
  initialMd,
  templateSlug,
  restoreContentMd,
  onRestoreApplied,
  onAddComment,
  onDirtyChange,
  onSavingChange,
}, ref) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.user.me.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.me.invalidate(),
  });

  const [mode, setModeState] = useState<EditorMode>(() => {
    if (typeof window === "undefined") return "wysiwyg";
    const stored = localStorage.getItem(EDITOR_PREFERENCE_KEY) as string | null;
    if (stored === "wysiwyg" || stored === "markdown") return stored;
    if (stored === "split") return "markdown"; // legacy: treat split as markdown
    return "wysiwyg";
  });
  const [markdownValue, setMarkdownValue] = useState("");
  const [markdownDirty, setMarkdownDirty] = useState(false);
  const markdownSyncFromEditorRef = useRef(true);

  const setMode = useCallback(
    (next: EditorMode) => {
      setModeState(next);
      localStorage.setItem(EDITOR_PREFERENCE_KEY, next);
      updateProfile.mutate({ editor_preference: next });
    },
    [updateProfile]
  );

  // Apply saved user preference when profile loads (e.g. after reload). Without this,
  // we default to "wysiwyg" because me is undefined on first paint, and never switch.
  useEffect(() => {
    const pref = me?.profile?.editor_preference as string | undefined;
    const resolved: EditorMode = pref === "markdown" ? "markdown" : "wysiwyg"; // treat "split" or unknown as wysiwyg
    if (!pref) return;
    const stored = localStorage.getItem(EDITOR_PREFERENCE_KEY);
    if (stored != null && stored !== "") return;
    setModeState(resolved);
    localStorage.setItem(EDITOR_PREFERENCE_KEY, resolved);
  }, [me?.profile?.editor_preference]);

  const hasInitialContent = Boolean(
    (typeof initialYjsBase64 === "string" && initialYjsBase64) || (typeof initialMd === "string" && initialMd?.trim())
  );

  const templateContent = trpc.template.getContent.useQuery(
    { slug: templateSlug! },
    { enabled: !hasInitialContent && !!templateSlug }
  );

  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    if (typeof initialYjsBase64 === "string" && initialYjsBase64) {
      try {
        Y.applyUpdate(doc, base64ToUint8Array(initialYjsBase64));
      } catch {
        // ignore invalid state
      }
    }
    return doc;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply initial state once per documentId
  }, [documentId]);

  const fragment = useMemo(() => ydoc.getXmlFragment("default"), [ydoc]);

  const [partyProvider, setPartyProvider] = useState<InstanceType<typeof import("y-partykit/provider").default> | null>(null);
  const partyProviderRef = useRef<InstanceType<typeof import("y-partykit/provider").default> | null>(null);
  useEffect(() => {
    if (!PARTYKIT_URL || !documentId) {
      setPartyProvider(null);
      partyProviderRef.current = null;
      return undefined;
    }
    let mounted = true;
    import("y-partykit/provider").then(({ default: YPartyKitProvider }) => {
      const p = new YPartyKitProvider(PARTYKIT_URL!, documentId, ydoc, { connect: true });
      partyProviderRef.current = p;
      if (mounted) setPartyProvider(p);
    });
    return () => {
      mounted = false;
      const p = partyProviderRef.current;
      partyProviderRef.current = null;
      if (p) p.destroy();
    };
  }, [documentId, ydoc]);

  const editorReady = !PARTYKIT_URL || partyProvider !== null;

  if (!editorReady) {
    return (
      <div className="rounded border border-border bg-surface flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <DocumentEditorBody
      ref={ref}
      documentId={documentId}
      ydoc={ydoc}
      fragment={fragment}
      partyProvider={partyProvider}
      me={me}
      hasInitialContent={hasInitialContent}
      initialMd={initialMd}
      initialYjsBase64={initialYjsBase64}
      templateSlug={templateSlug}
      templateContent={templateContent.data}
      setMode={setMode}
      mode={mode}
      markdownValue={markdownValue}
      setMarkdownValue={setMarkdownValue}
      markdownDirty={markdownDirty}
      setMarkdownDirty={setMarkdownDirty}
      markdownSyncFromEditorRef={markdownSyncFromEditorRef}
      updateProfile={updateProfile}
      restoreContentMd={restoreContentMd}
      onRestoreApplied={onRestoreApplied}
      onAddComment={onAddComment}
      onDirtyChange={onDirtyChange}
      onSavingChange={onSavingChange}
    />
  );
});

const DocumentEditorBody = forwardRef<
  DocumentEditorHandle,
  {
    documentId: string;
    ydoc: Y.Doc;
    fragment: Y.XmlFragment;
    partyProvider: InstanceType<typeof import("y-partykit/provider").default> | null;
    me: { user: { id: string; email?: string }; profile?: { full_name?: string } | null } | undefined;
    hasInitialContent: boolean;
    initialMd: string | null;
    initialYjsBase64: string | null;
    templateSlug?: string | null;
    templateContent: string | undefined;
    setMode: (m: EditorMode) => void;
    mode: EditorMode;
    markdownValue: string;
    setMarkdownValue: React.Dispatch<React.SetStateAction<string>>;
    markdownDirty: boolean;
    setMarkdownDirty: React.Dispatch<React.SetStateAction<boolean>>;
    markdownSyncFromEditorRef: React.MutableRefObject<boolean>;
    updateProfile: ReturnType<typeof trpc.user.updateProfile.useMutation>;
    restoreContentMd?: string | null;
    onRestoreApplied?: () => void;
    onAddComment?: (anchor: { from: number; to: number }) => void;
    onDirtyChange?: (dirty: boolean) => void;
    onSavingChange?: (saving: boolean) => void;
  }
>(function DocumentEditorBody({
  documentId,
  ydoc,
  fragment,
  partyProvider,
  me,
  hasInitialContent,
  initialMd,
  initialYjsBase64,
  templateSlug,
  templateContent,
  setMode,
  mode,
  markdownValue,
  setMarkdownValue,
  markdownDirty,
  setMarkdownDirty,
  markdownSyncFromEditorRef,
  updateProfile,
  restoreContentMd,
  onRestoreApplied,
  onAddComment,
  onDirtyChange,
  onSavingChange,
}, ref) {
  const collaborationUser = useMemo(
    () =>
      me?.user
        ? {
            name: (me.profile?.full_name ?? me.user.email ?? "User") as string,
            color: colorFromUserId(me.user.id),
          }
        : { name: "User", color: "#6b7280" },
    [me]
  );

  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false, codeBlock: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Collaboration.configure({ fragment }),
      ...(partyProvider
        ? [
            CollaborationCursor.configure({
              provider: partyProvider,
              user: collaborationUser,
            }),
          ]
        : []),
    ],
    content: null,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-text",
      },
      handleKeyDown(view, event) {
        if (event.key === "/") {
          event.preventDefault();
          setShowSlashMenu(true);
          return true;
        }
        if (event.key === "Escape") {
          setShowSlashMenu(false);
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!showSlashMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSlashMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showSlashMenu]);

  useEffect(() => {
    if (!editor || !onAddComment) return;
    const onSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      setSelectionRange(from !== to ? { from, to } : null);
    };
    editor.on("selectionUpdate", onSelectionUpdate);
    return () => {
      editor.off("selectionUpdate", onSelectionUpdate);
    };
  }, [editor, onAddComment]);

  const updateContent = trpc.document.updateContent.useMutation();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const hasUnsavedChanges = dirty || markdownDirty;
  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
  }, [hasUnsavedChanges, onDirtyChange]);
  useEffect(() => {
    onSavingChange?.(updateContent.isPending);
  }, [updateContent.isPending, onSavingChange]);

  const persist = useCallback(
    (overrideMd?: string) => {
      if (!editor || !documentId) return;
      const state = Y.encodeStateAsUpdate(ydoc);
      const yjsBase64 =
        typeof Buffer !== "undefined"
          ? Buffer.from(state).toString("base64")
          : btoa(String.fromCharCode(...state));
      if (yjsBase64 === lastSavedRef.current) return;
      // Store Markdown in DB: use raw markdown when provided (from markdown panel), else convert WYSIWYG HTML to MD
      let contentMd: string;
      if (overrideMd !== undefined) {
        contentMd = overrideMd;
      } else {
        const html = editor.getHTML() ?? "";
        try {
          contentMd = turndown.turndown(html);
        } catch {
          contentMd = html;
        }
      }
      updateContent.mutate(
      { documentId, contentYjs: yjsBase64, contentMd },
      {
        onSuccess: () => {
          lastSavedRef.current = yjsBase64;
          setDirty(false);
        },
      }
    );
    },
    [documentId, editor, ydoc, updateContent]
  );

  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      setDirty(true);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(persist, DEBOUNCE_MS);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editor, persist]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const initialMdApplied = useRef(false);
  useEffect(() => {
    if (!editor || initialMdApplied.current) return;
    const applyMd = (md: string) => {
      try {
        const trimmed = md.trim();
        const html = trimmed.startsWith("<") ? trimmed : (marked(md) as string);
        editor.commands.setContent(html, false);
        markdownSyncFromEditorRef.current = false;
        setMarkdownValue(md);
        setMarkdownDirty(false);
        initialMdApplied.current = true;
      } catch {
        initialMdApplied.current = true;
      }
    };
    if (hasInitialContent && initialMd && !initialYjsBase64) {
      applyMd(initialMd);
      return;
    }
    if (hasInitialContent && initialMd && initialYjsBase64 && fragment.length === 0) {
      applyMd(initialMd);
      return;
    }
    if (!hasInitialContent && templateSlug && templateContent) {
      try {
        const html = marked(templateContent) as string;
        editor.commands.setContent(html, false);
        const md = templateContent;
        markdownSyncFromEditorRef.current = false;
        setMarkdownValue(md);
        setMarkdownDirty(false);
        initialMdApplied.current = true;
      } catch {
        initialMdApplied.current = true;
      }
    }
  }, [editor, hasInitialContent, initialMd, initialYjsBase64, templateSlug, templateContent, fragment.length]);

  useEffect(() => {
    if (!editor || !restoreContentMd) return;
    try {
      const trimmed = restoreContentMd.trim();
      const isLegacyHtml = trimmed.startsWith("<");
      const html = isLegacyHtml ? trimmed : (marked(restoreContentMd) as string);
      const mdForPanel = isLegacyHtml ? (() => { try { return turndown.turndown(trimmed); } catch { return trimmed; } })() : restoreContentMd;
      markdownSyncFromEditorRef.current = false;
      setMarkdownValue(mdForPanel);
      setMarkdownDirty(false);
      editor.commands.setContent(html, false);
      setDirty(true);
      setTimeout(() => persist(mdForPanel), 0);
    } catch {
      // ignore
    }
    onRestoreApplied?.();
  }, [restoreContentMd, editor, setMarkdownValue, setMarkdownDirty, persist, onRestoreApplied]);

  useEffect(() => {
    if (!editor || mode === "wysiwyg") return;
    const syncEditorToMarkdown = () => {
      if (markdownSyncFromEditorRef.current) {
        try {
          setMarkdownValue(turndown.turndown(editor.getHTML() ?? ""));
          setMarkdownDirty(false);
        } catch {
          setMarkdownValue("");
        }
      }
      markdownSyncFromEditorRef.current = true;
    };
    syncEditorToMarkdown();
    const t = setTimeout(syncEditorToMarkdown, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ref and setters are stable
  }, [editor, mode]);

  const applyMarkdownToEditor = useCallback(
    (md: string) => {
      if (!editor) return;
      try {
        const html = marked(md) as string;
        markdownSyncFromEditorRef.current = false;
        editor.commands.setContent(html, false);
        setDirty(true);
        // Save the raw markdown as-is so the user's formatting is preserved
        persist(md);
      } catch {
        // ignore
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markdownSyncFromEditorRef is ref
    [editor, persist]
  );

  const handleMarkdownChange = (value: string) => {
    setMarkdownValue(value);
    setMarkdownDirty(true);
  };

  const handleMarkdownBlur = () => {
    if (markdownDirty) {
      applyMarkdownToEditor(markdownValue);
      setMarkdownDirty(false);
    }
  };

  const save = useCallback(() => {
    if (markdownDirty) {
      applyMarkdownToEditor(markdownValue);
      setMarkdownDirty(false);
    } else {
      persist();
    }
  }, [markdownDirty, markdownValue, applyMarkdownToEditor, persist]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  if (!editor) return null;

  const statusText = updateContent.isPending ? "Saving…" : dirty ? "Unsaved" : "Saved";
  const currentMd =
    mode === "markdown"
      ? markdownValue
      : (() => {
          try {
            return turndown.turndown(editor.getHTML() ?? "");
          } catch {
            return "";
          }
        })();
  const okrProgress =
    templateSlug === "okr" ? countTaskItems(currentMd) : null;

  return (
    <div className="rounded border border-border bg-surface flex flex-col">
      <div className="no-print flex items-center gap-1 border-b border-border px-2 py-1.5 flex-wrap">
        <EditorToolbar
          editor={editor}
          selectionRange={selectionRange}
          onAddComment={onAddComment}
        />
        <div className="ml-auto flex items-center gap-1 border-l border-border pl-2">
          {(["wysiwyg", "markdown"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (m === "wysiwyg" && mode === "markdown" && markdownDirty) {
                  applyMarkdownToEditor(markdownValue);
                  setMarkdownDirty(false);
                }
                setMode(m);
              }}
              className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                mode === m
                  ? "bg-accent text-white"
                  : "text-text-muted hover:bg-bg hover:text-text"
              }`}
            >
              {m === "wysiwyg" ? "WYSIWYG" : "Markdown"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-1 min-h-0 relative">
        {mode === "wysiwyg" && (
          <div className="flex-1 min-w-0">
            {showSlashMenu && editor && (
              <SlashMenu
                editor={editor}
                onSelect={() => setShowSlashMenu(false)}
              />
            )}
            <EditorContent editor={editor} />
          </div>
        )}
        {mode === "markdown" && (
          <div className="flex-1 min-w-0 flex flex-col min-h-[200px] data-color-mode-light">
            <MDEditor
              value={markdownValue}
              onChange={(val) => {
                setMarkdownValue(val ?? "");
                setMarkdownDirty(true);
              }}
              preview="live"
              visibleDragbar={false}
              height="100%"
              textareaProps={{
                placeholder: "Write markdown…",
                onBlur: handleMarkdownBlur,
              }}
            />
          </div>
        )}
      </div>
      <div className="no-print border-t border-border px-4 py-1.5 flex items-center justify-between gap-4 text-xs text-text-muted">
        <span>{statusText}</span>
        {okrProgress !== null && okrProgress.total > 0 && (
          <span>
            Key results: {okrProgress.done}/{okrProgress.total} done
          </span>
        )}
      </div>
    </div>
  );
});

function EditorToolbar({
  editor,
  selectionRange,
  onAddComment,
}: {
  editor: ReturnType<typeof useEditor>;
  selectionRange: { from: number; to: number } | null;
  onAddComment?: (anchor: { from: number; to: number }) => void;
}) {
  if (!editor) return null;
  return (
    <div className="flex items-center gap-0.5 flex-wrap">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold"
      >
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic"
      >
        <em>I</em>
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        H1
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        H3
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet list"
      >
        •
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Numbered list"
      >
        1.
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        “
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code block"
      >
        {"</>"}
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
        active={editor.isActive("table")}
        title="Insert table"
      >
        Table
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive("taskList")}
        title="Checklist"
      >
        Checklist
      </ToolbarButton>
      {onAddComment && selectionRange && (
        <>
          <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
          <button
            type="button"
            onClick={() => onAddComment(selectionRange)}
            className="rounded p-1.5 text-sm text-text-muted hover:bg-bg hover:text-text"
            title="Add comment"
          >
            Comment
          </button>
        </>
      )}
    </div>
  );
}

function SlashMenu({
  editor,
  onSelect,
}: {
  editor: NonNullable<ReturnType<typeof useEditor>>;
  onSelect: () => void;
}) {
  const run = (fn: () => boolean) => {
    fn();
    onSelect();
  };
  const items: { label: string; fn: () => boolean }[] = [
    { label: "Heading 1", fn: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", fn: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", fn: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bullet list", fn: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", fn: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Checklist", fn: () => editor.chain().focus().toggleTaskList().run() },
    {
      label: "Table",
      fn: () =>
        editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    },
    { label: "Code block", fn: () => editor.chain().focus().toggleCodeBlock().run() },
  ];
  return (
    <div
      className="absolute left-4 top-12 z-10 rounded-md border border-border bg-surface py-1 shadow-md min-w-[180px]"
      role="menu"
      aria-label="Insert block"
    >
      {items.map(({ label, fn }) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          className="w-full px-3 py-1.5 text-left text-sm text-text hover:bg-bg"
          onClick={() => run(fn)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 text-sm ${
        active ? "bg-accent text-white" : "text-text-muted hover:bg-bg hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
