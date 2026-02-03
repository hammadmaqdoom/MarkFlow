"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { marked } from "marked";

marked.setOptions({ gfm: true });

type ShareFile = { id: string; name: string; path?: string; content_md: string };
type ShareDoc =
  | { type: "file"; id: string; name: string; content_md: string }
  | { type: "folder"; id: string; name: string; children: ShareFile[] }
  | { type: "project"; id: string; name: string; children: ShareFile[] };

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const [doc, setDoc] = useState<ShareDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [needPassword, setNeedPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const fetchDoc = async (pwd?: string) => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const url = pwd
        ? `/api/s/${encodeURIComponent(token)}?password=${encodeURIComponent(pwd)}`
        : `/api/s/${encodeURIComponent(token)}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) setNeedPassword(true);
        else setError((data as { error?: string }).error ?? "Failed to load");
        return;
      }
      const dataTyped = data as ShareDoc;
      setDoc(dataTyped);
      setNeedPassword(false);
      if (dataTyped.type === "folder" || dataTyped.type === "project") {
        setSelectedFileId(
          dataTyped.children.length > 0 ? dataTyped.children[0].id : null
        );
      }
    } catch {
      setError("Failed to load document");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setSelectedFileId(null);
    void fetchDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on token change only
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-text-muted">Invalid share link</p>
      </div>
    );
  }

  if (needPassword && !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded border border-border bg-surface p-6 space-y-4">
          <h1 className="text-lg font-semibold text-text">Password required</h1>
          <p className="text-sm text-text-muted">
            This link is protected. Enter the password to view.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void fetchDoc(password);
            }}
            className="space-y-3"
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Loading…" : "View document"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error && !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-text-muted">{error}</p>
          <Link
            href="/"
            className="inline-flex rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to MarkFlow
          </Link>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  const proseClass =
    "prose prose-sm max-w-none text-text prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-ol:my-2";

  const isFolderOrProject = doc.type === "folder" || doc.type === "project";
  if (isFolderOrProject) {
    const files = doc.children;
    const selectedFile =
      files.find((f) => f.id === selectedFileId) ?? files[0] ?? null;

    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <header className="shrink-0 border-b border-border bg-surface px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-text truncate">{doc.name}</h1>
          <Link
            href="/"
            className="shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
          >
            Open in MarkFlow
          </Link>
        </header>
        <div className="flex-1 flex min-h-0">
          <aside className="shrink-0 w-56 border-r border-border bg-surface flex flex-col">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Files
              </span>
            </div>
            <nav className="flex-1 overflow-y-auto py-2">
              {files.length === 0 ? (
                <p className="px-3 py-2 text-sm text-text-muted">
                  {doc.type === "project" ? "No files" : "No files in folder"}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {files.map((file) => (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedFileId(file.id)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-md truncate transition-colors ${
                          selectedFileId === file.id
                            ? "bg-accent/15 text-accent font-medium"
                            : "text-text hover:bg-bg"
                        }`}
                      >
                        {file.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </nav>
          </aside>
          <main className="flex-1 min-w-0 overflow-auto">
            {selectedFile ? (
              <div className="max-w-3xl mx-auto px-6 py-6">
                <h2 className="text-lg font-semibold text-text mb-4">{selectedFile.name}</h2>
                <div
                  className={proseClass}
                  dangerouslySetInnerHTML={{
                    __html: marked(selectedFile.content_md ?? "") as string,
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-text-muted">
                Select a file
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  const html = marked(doc.content_md ?? "") as string;
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="border-b border-border bg-surface px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold text-text">{doc.name}</h1>
          <Link
            href="/"
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text hover:bg-bg"
          >
            Open in MarkFlow
          </Link>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className={proseClass} dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
