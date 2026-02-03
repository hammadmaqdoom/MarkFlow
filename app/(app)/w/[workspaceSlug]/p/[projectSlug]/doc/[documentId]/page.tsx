"use client";

import { Breadcrumb } from "@/components/app/Breadcrumb";
import { addRecentDoc } from "@/components/app/QuickSwitcher";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { trpc } from "@/trpc/client";

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
        <Breadcrumb documentName={docMeta.name} documentId={docMeta.id} />
        <h1 className="mt-2 text-xl font-semibold text-text">{docMeta.name}</h1>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <DocumentEditorLazy
          documentId={documentId}
          initialYjsBase64={docMeta.content_yjs_base64 ?? null}
          initialMd={docMeta.content_md ?? null}
          templateSlug={docMeta.template_slug ?? null}
        />
      </div>
    </div>
  );
}
