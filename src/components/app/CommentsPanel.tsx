"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Modal, Button, Input } from "@/components/ui";

type Anchor = { from: number; to: number };
type Comment = {
  id: string;
  document_id: string;
  author_id: string;
  parent_id: string | null;
  anchor: Anchor;
  content_text: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export function CommentsPanel({
  documentId,
  open,
  onClose,
  pendingAnchor,
  onClearPendingAnchor,
  currentUserId,
}: {
  documentId: string;
  open: boolean;
  onClose: () => void;
  pendingAnchor: Anchor | null;
  onClearPendingAnchor: () => void;
  currentUserId: string;
}) {
  const [newCommentText, setNewCommentText] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const { data: comments, refetch } = trpc.comment.list.useQuery(
    { documentId, resolved: showResolved ? true : false },
    { enabled: open && !!documentId }
  );
  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewCommentText("");
      onClearPendingAnchor();
    },
  });
  const resolveComment = trpc.comment.resolve.useMutation({ onSuccess: () => refetch() });
  const unresolveComment = trpc.comment.unresolve.useMutation({ onSuccess: () => refetch() });
  const deleteComment = trpc.comment.delete.useMutation({ onSuccess: () => refetch() });

  const rootComments = (comments ?? []).filter((c) => !(c as Comment).parent_id);
  const getReplies = (id: string) => (comments ?? []).filter((c) => (c as Comment).parent_id === id);

  const handleSubmitNew = () => {
    if (!pendingAnchor || !newCommentText.trim()) return;
    createComment.mutate({
      documentId,
      anchor: pendingAnchor,
      contentText: newCommentText.trim(),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Comments">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-auto">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            Show resolved
          </label>
        </div>
        {pendingAnchor && (
          <div className="border border-border rounded p-3 bg-bg">
            <p className="text-xs text-text-muted mb-2">New comment on selection</p>
            <Input
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Write a comment…"
              className="mb-2"
            />
            <div className="flex gap-2">
              <Button onClick={handleSubmitNew} disabled={createComment.isPending || !newCommentText.trim()}>
                {createComment.isPending ? "Saving…" : "Save"}
              </Button>
              <button
                type="button"
                onClick={onClearPendingAnchor}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-bg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {rootComments.length === 0 && !pendingAnchor ? (
            <p className="text-sm text-text-muted">No comments yet. Select text and click Comment to add one.</p>
          ) : (
            rootComments.map((c) => {
              const comment = c as Comment;
              const replies = getReplies(comment.id);
              return (
                <div key={comment.id} className="border border-border rounded p-3 bg-surface">
                  <p className="text-sm text-text whitespace-pre-wrap">{comment.content_text}</p>
                  <p className="text-xs text-text-muted mt-1">
                    {comment.author_id === currentUserId ? "You" : "User"} ·{" "}
                    {new Date(comment.created_at).toLocaleString()}
                    {comment.resolved_at && " · Resolved"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {comment.resolved_at ? (
                      <button
                        type="button"
                        onClick={() => unresolveComment.mutate({ id: comment.id })}
                        className="text-xs text-accent hover:underline"
                      >
                        Unresolve
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resolveComment.mutate({ id: comment.id })}
                        className="text-xs text-accent hover:underline"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteComment.mutate({ id: comment.id })}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  {replies.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-border space-y-2">
                      {replies.map((r) => {
                        const reply = r as Comment;
                        return (
                          <div key={reply.id}>
                            <p className="text-sm text-text whitespace-pre-wrap">{reply.content_text}</p>
                            <p className="text-xs text-text-muted">
                              {reply.author_id === currentUserId ? "You" : "User"} ·{" "}
                              {new Date(reply.created_at).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
