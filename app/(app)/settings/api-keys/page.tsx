"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";
import { trpc } from "@/trpc/client";

export default function ApiKeysPage() {
  const [newKey, setNewKey] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: keys, isLoading } = trpc.user.listApiKeys.useQuery();
  const createKey = trpc.user.createApiKey.useMutation({
    onSuccess: (data) => {
      setNewKey(data.key);
      utils.user.listApiKeys.invalidate();
    },
  });
  const revokeKey = trpc.user.revokeApiKey.useMutation({
    onSuccess: () => utils.user.listApiKeys.invalidate(),
  });

  function copyKey(key: string) {
    void navigator.clipboard.writeText(key);
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-semibold text-text">API keys</h1>
      <p className="mt-1 text-sm text-text-muted">
        Use API keys for MCP (Claude Desktop, Cursor) or other programmatic access. Keys start with <code className="rounded bg-bg px-1 font-mono text-xs">mf_</code> and are shown only once when created.
      </p>

      <div className="mt-6 flex items-center gap-2">
        <Button
          onClick={() => createKey.mutate({ name: "MCP / API" })}
          disabled={createKey.isPending}
        >
          {createKey.isPending ? "Creating…" : "Create API key"}
        </Button>
      </div>

      {newKey && (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <p className="text-sm font-medium text-text">New key (copy now — it won’t be shown again):</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-bg px-2 py-1 font-mono text-sm text-text">
              {newKey}
            </code>
            <Button size="sm" onClick={() => copyKey(newKey)}>
              Copy
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 text-sm text-text-muted hover:text-text"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-medium text-text">Your API keys</h2>
        {isLoading ? (
          <p className="mt-2 text-sm text-text-muted">Loading…</p>
        ) : keys?.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">No API keys yet. Create one above.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {keys?.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <div>
                  <span className="font-medium text-text">{k.name}</span>
                  <span className="ml-2 text-xs text-text-muted">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => revokeKey.mutate({ id: k.id })}
                  disabled={revokeKey.isPending}
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
