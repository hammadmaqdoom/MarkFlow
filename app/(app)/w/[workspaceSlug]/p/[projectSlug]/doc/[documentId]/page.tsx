"use client";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { addRecentDoc } from "@/components/app/QuickSwitcher";
import { CommentsPanel } from "@/components/app/CommentsPanel";
import { ShareModal } from "@/components/app/ShareModal";
import { VersionHistoryPanel } from "@/components/app/VersionHistoryPanel";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import type { DocumentEditorHandle } from "@/components/editor/DocumentEditor";

const DocumentEditorLazy = dynamic(
  () =>
    import("@/components/editor/DocumentEditor").then((m) => ({
      default: m.DocumentEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded border border-border bg-surface p-8 min-h-[200px] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    ),
  }
);

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.documentId as string;
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [pendingCommentAnchor, setPendingCommentAnchor] = useState<{ from: number; to: number } | null>(null);
  const [restoreContentMd, setRestoreContentMd] = useState<string | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const editorRef = useRef<DocumentEditorHandle | null>(null);
  const { data: me } = trpc.user.me.useQuery();
  const { data: doc, error, isLoading } = trpc.document.getById.useQuery(
    { documentId, includeContent: true },
    { enabled: !!documentId }
  );

  useEffect(() => {
    if (!doc) return;
    const meta = doc as unknown as { id: string; name: string };
    addRecentDoc({
      id: meta.id,
      name: meta.name,
      workspaceSlug,
      projectSlug,
    });
  }, [doc, workspaceSlug, projectSlug]);

  // Reset editor UI state when switching documents so we don't show previous doc's dirty/saving
  useEffect(() => {
    setEditorDirty(false);
    setEditorSaving(false);
    setRestoreContentMd(null);
  }, [documentId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }
  if (error?.data?.code === "NOT_FOUND" || (!isLoading && !doc)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <h2 className="text-lg font-medium text-text">Document not found</h2>
        <p className="text-sm text-text-muted">
          This document may have been moved or deleted.
        </p>
      </div>
    );
  }
  if (!doc) return null;

  const docMeta = doc as unknown as {
    id: string;
    name: string;
    content_yjs_base64?: string;
    content_md?: string | null;
    template_slug?: string | null;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="no-print">
              <Breadcrumb documentName={docMeta.name} documentId={docMeta.id} />
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <button
              type="button"
              onClick={() => editorRef.current?.save()}
              disabled={!editorDirty || editorSaving}
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[72px] justify-center"
            >
              {editorSaving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
            >
              Export as PDF
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
            >
              Share
            </button>
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
            >
              Comments
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
            >
              History
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <DocumentEditorLazy
          key={documentId}
          ref={editorRef}
          documentId={documentId}
          initialYjsBase64={docMeta.content_yjs_base64 ?? null}
          initialMd={docMeta.content_md ?? null}
          templateSlug={docMeta.template_slug ?? null}
          restoreContentMd={restoreContentMd}
          onRestoreApplied={() => setRestoreContentMd(null)}
          onDirtyChange={setEditorDirty}
          onSavingChange={setEditorSaving}
          onAddComment={(anchor) => {
            setPendingCommentAnchor(anchor);
            setCommentsOpen(true);
          }}
        />
      </div>
      <CommentsPanel
        documentId={documentId}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        pendingAnchor={pendingCommentAnchor}
        onClearPendingAnchor={() => setPendingCommentAnchor(null)}
        currentUserId={me?.user?.id ?? ""}
      />
      <ShareModal
        documentId={documentId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
      <VersionHistoryPanel
        documentId={documentId}
        currentContentMd={docMeta.content_md ?? null}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestore={(md) => setRestoreContentMd(md)}
      />
    </div>
  );
}
