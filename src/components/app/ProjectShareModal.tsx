"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { Modal, Input, Label, Button } from "@/components/ui";

export function ProjectShareModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);
  const [scope, setScope] = useState<"public" | "password">("public");
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const { data: links, refetch } = trpc.shareLink.listProject.useQuery(
    { projectId },
    { enabled: open && !!projectId }
  );
  const createLink = trpc.shareLink.createProject.useMutation({
    onSuccess: () => refetch(),
  });
  const revokeLink = trpc.shareLink.revokeProject.useMutation({
    onSuccess: () => refetch(),
  });

  const handleCreate = () => {
    if (scope === "password" && !password.trim()) return;
    createLink.mutate(
      {
        projectId,
        scope,
        password: scope === "password" ? password : undefined,
        expiresAt: expiresAt.trim() || undefined,
      },
      {
        onSuccess: () => {
          setPassword("");
          setExpiresAt("");
        },
      }
    );
  };

  const copyUrl = (token: string) => {
    const url = baseUrl ? `${baseUrl}/s/${token}` : `${window.location.origin}/s/${token}`;
    void navigator.clipboard.writeText(url);
  };

  return (
    <Modal open={open} onClose={onClose} title="Share project">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="project-scope"
                checked={scope === "public"}
                onChange={() => setScope("public")}
              />
              Public
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="project-scope"
                checked={scope === "password"}
                onChange={() => setScope("password")}
              />
              Password-protected
            </label>
          </div>
          {scope === "password" && (
            <div>
              <Label htmlFor="project-share-password">Password</Label>
              <Input
                id="project-share-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="project-share-expires">Expires at (optional)</Label>
            <Input
              id="project-share-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleCreate}
            disabled={createLink.isPending || (scope === "password" && !password.trim())}
          >
            {createLink.isPending ? "Creating…" : "Create link"}
          </Button>
        </div>
        {links && links.length > 0 && (
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-text mb-2">Active links</h3>
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between gap-2 text-sm border border-border rounded px-3 py-2"
                >
                  <span>
                    {link.scope === "password" ? "Password-protected" : "Public"}
                    {link.expires_at
                      ? ` · Expires ${new Date(link.expires_at as string).toLocaleString()}`
                      : ""}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => copyUrl(link.token)}
                      className="rounded px-2 py-1 text-xs bg-bg hover:bg-border"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => revokeLink.mutate({ id: link.id })}
                      disabled={revokeLink.isPending}
                      className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Revoke
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
