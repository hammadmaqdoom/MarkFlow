"use client";

import { useState } from "react";
import { diffLines, type Change } from "diff";
import { trpc } from "@/trpc/client";
import { Modal } from "@/components/ui";

export function VersionHistoryPanel({
  documentId,
  currentContentMd,
  open,
  onClose,
  onRestore,
}: {
  documentId: string;
  currentContentMd: string | null;
  open: boolean;
  onClose: () => void;
  onRestore: (contentMd: string) => void;
}) {
  const { data: versions, isLoading } = trpc.document.listVersions.useQuery(
    { documentId },
    { enabled: open && !!documentId }
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const { data: versionContent, isLoading: loadingVersion } =
    trpc.document.getVersion.useQuery(
      { documentId, versionId: selectedVersionId! },
      { enabled: open && !!selectedVersionId }
    );

  const currentMd = String(currentContentMd ?? "");
  const versionMd = String(versionContent?.content_md ?? "");
  const diffResult = diffLines(currentMd, versionMd);

  return (
    <Modal open={open} onClose={onClose} title="Version history">
      <div className="flex flex-col gap-4 max-h-[70vh]">
        <div className="flex gap-4 min-h-0">
          <div className="w-48 shrink-0 border border-border rounded overflow-auto bg-bg">
            {isLoading ? (
              <div className="p-3 text-sm text-text-muted">Loading…</div>
            ) : !versions?.length ? (
              <div className="p-3 text-sm text-text-muted">No versions yet</div>
            ) : (
              <ul className="p-1">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedVersionId(v.id)}
                      className={`w-full text-left px-3 py-2 text-sm rounded ${
                        selectedVersionId === v.id
                          ? "bg-accent text-white"
                          : "text-text hover:bg-bg"
                      }`}
                    >
                      <span className="font-medium">v{v.version_number}</span>
                      <span className="block text-xs opacity-80">
                        {v.created_at
                          ? new Date(v.created_at as string).toLocaleString()
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 min-w-0 border border-border rounded overflow-auto bg-surface">
            {!selectedVersionId ? (
              <div className="p-4 text-sm text-text-muted">
                Select a version to compare
              </div>
            ) : loadingVersion ? (
              <div className="p-4 text-sm text-text-muted">Loading…</div>
            ) : (
              <div className="p-4 font-mono text-xs whitespace-pre overflow-x-auto">
                {diffResult.map((part: Change, i: number) => {
                  const bg =
                    part.added
                      ? "bg-green-500/20"
                      : part.removed
                        ? "bg-red-500/20"
                        : "";
                  return (
                    <div key={i} className={part.added || part.removed ? bg : ""}>
                      {part.value
                        .split("\n")
                        .map((line: string, j: number) =>
                          line ? (
                            <div key={j}>
                              {part.added ? "+ " : part.removed ? "- " : "  "}
                              {line}
                            </div>
                          ) : (
                            <br key={j} />
                          )
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {selectedVersionId && versionContent?.content_md != null && (
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => {
                onRestore(versionContent.content_md as string);
                onClose();
              }}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Restore this version
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
