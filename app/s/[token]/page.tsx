"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";
import { resolveDocPath, isInternalDocLink } from "@/lib/resolvePath";

/** Merge class names; rehype-slug adds ids */
function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Context for share page internal links */
interface ShareLinkContextValue {
  currentFilePath: string;
  files: ShareFile[];
  onSelectFile: (fileId: string) => void;
}
const ShareLinkContext = createContext<ShareLinkContextValue | null>(null);

/** Custom link component that handles internal links in share view */
function ShareLinkComponent({
  href,
  title,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const ctx = useContext(ShareLinkContext);
  
  const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
  const isAnchor = href?.startsWith("#");
  const isInternal = href && isInternalDocLink(href);
  
  // Resolve internal links to find target file
  const targetFile = useMemo(() => {
    if (!isInternal || !href || !ctx) return null;
    const resolvedPath = resolveDocPath(ctx.currentFilePath, href);
    // Find file by path (exact match or with/without extension)
    return ctx.files.find((f) => {
      const filePath = f.path ?? f.name;
      return (
        filePath === resolvedPath ||
        filePath === resolvedPath.replace(/\.md$/, "") ||
        filePath.replace(/\.md$/, "") === resolvedPath.replace(/\.md$/, "")
      );
    });
  }, [isInternal, href, ctx]);
  
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (targetFile && ctx) {
        e.preventDefault();
        ctx.onSelectFile(targetFile.id);
      }
    },
    [targetFile, ctx]
  );
  
  const linkClass = cn(
    className,
    "transition-colors",
    isAnchor ? "text-accent hover:underline cursor-pointer" : undefined,
    isExternal ? "text-accent no-underline hover:underline" : undefined,
    isInternal && targetFile ? "text-accent hover:underline cursor-pointer" : undefined,
    isInternal && !targetFile && ctx ? "text-red-500 line-through cursor-not-allowed" : undefined
  );
  
  // External link
  if (isExternal) {
    return (
      <a
        href={href}
        title={title ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        {...props}
      >
        {children}
      </a>
    );
  }
  
  // Internal link with target found
  if (isInternal && targetFile && ctx) {
    return (
      <a
        href="#"
        onClick={handleClick}
        title={title ?? `Open ${targetFile.name}`}
        className={linkClass}
        {...props}
      >
        {children}
      </a>
    );
  }
  
  // Internal link with no target (broken link)
  if (isInternal && ctx && !targetFile) {
    const resolvedPath = href ? resolveDocPath(ctx.currentFilePath, href) : href;
    return (
      <span
        className={linkClass}
        title={`Document not found: ${resolvedPath}`}
        {...props}
      >
        {children}
      </span>
    );
  }
  
  // Anchor or fallback
  return (
    <a
      href={href}
      title={title ?? undefined}
      className={linkClass}
      {...props}
    >
      {children}
    </a>
  );
}

/** Heading components: explicit size/weight so headings always stand out; scroll-margin for TOC */
function getMarkdownComponents(useShareLinks: boolean): Components {
  return {
    h1: (props) => <h1 {...props} className={cn(props.className, "scroll-mt-4 mt-6 mb-3 text-2xl font-bold text-text")} />,
    h2: (props) => <h2 {...props} className={cn(props.className, "scroll-mt-4 mt-6 mb-3 text-xl font-semibold text-text")} />,
    h3: (props) => <h3 {...props} className={cn(props.className, "scroll-mt-4 mt-4 mb-2 text-lg font-semibold text-text")} />,
    h4: (props) => <h4 {...props} className={cn(props.className, "scroll-mt-4 mt-4 mb-2 text-base font-semibold text-text")} />,
    h5: (props) => <h5 {...props} className={cn(props.className, "scroll-mt-4 mt-3 mb-1.5 text-sm font-semibold text-text")} />,
    h6: (props) => <h6 {...props} className={cn(props.className, "scroll-mt-4 mt-3 mb-1.5 text-sm font-semibold text-text-muted")} />,
    a: useShareLinks ? ShareLinkComponent as Components["a"] : ({ href, title, children, className, ...props }) => {
      const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
      const isAnchor = href?.startsWith("#");
      const linkClass = cn(
        className,
        "transition-colors",
        isAnchor ? "text-accent hover:underline cursor-pointer" : undefined,
        isExternal ? "text-accent no-underline hover:underline" : undefined
      );
      return (
        <a
          href={href}
          title={title ?? undefined}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className={linkClass}
          {...props}
        >
          {children}
        </a>
      );
    },
  };
}

type ShareFile = { id: string; name: string; path?: string; content_md: string };
type ShareDoc =
  | { type: "file"; id: string; name: string; content_md: string }
  | { type: "folder"; id: string; name: string; children: ShareFile[] }
  | { type: "project"; id: string; name: string; children: ShareFile[] };

/** Renders content: legacy HTML (starts with <) as raw HTML; otherwise as markdown via react-markdown */
function MarkdownContent({
  content,
  className,
  useShareLinks = false,
}: {
  content: string;
  className?: string;
  useShareLinks?: boolean;
}) {
  const trimmed = content.trim();
  if (trimmed.startsWith("<")) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: trimmed }} />;
  }
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkToc]}
        rehypePlugins={[rehypeSlug]}
        components={getMarkdownComponents(useShareLinks)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

type ShareTreeNode =
  | { type: "folder"; name: string; children: ShareTreeNode[] }
  | { type: "file"; file: ShareFile };

/** Build folder tree from flat file list using path (e.g. "compliance/landscape.md" -> folder compliance, file landscape.md) */
function buildShareTree(files: ShareFile[]): ShareTreeNode[] {
  const root: { folders: Map<string, { folders: Map<string, unknown>; files: ShareFile[] }>; files: ShareFile[] } = {
    folders: new Map(),
    files: [],
  };
  for (const file of files) {
    const pathStr = file.path ?? file.name;
    const segments = pathStr.split("/").filter(Boolean);
    if (segments.length <= 1) {
      root.files.push(file);
      continue;
    }
    const fileSegment = segments[segments.length - 1];
    const folderSegments = segments.slice(0, -1);
    let current: { folders: Map<string, { folders: Map<string, unknown>; files: ShareFile[] }>; files: ShareFile[] } = root;
    for (const seg of folderSegments) {
      if (!current.folders.has(seg)) {
        current.folders.set(seg, { folders: new Map(), files: [] });
      }
      current = current.folders.get(seg) as typeof root;
    }
    current.files.push({ ...file, name: fileSegment });
  }
  function toNodes(
    folders: Map<string, { folders: Map<string, unknown>; files: ShareFile[] }>,
    files: ShareFile[]
  ): ShareTreeNode[] {
    const nodes: ShareTreeNode[] = [];
    const folderNames = Array.from(folders.keys()).sort();
    for (const name of folderNames) {
      const child = folders.get(name)!;
      nodes.push({
        type: "folder",
        name,
        children: toNodes(child.folders as Map<string, { folders: Map<string, unknown>; files: ShareFile[] }>, child.files),
      });
    }
    const fileList = [...files].sort((a, b) => a.name.localeCompare(b.name));
    for (const file of fileList) {
      nodes.push({ type: "file", file });
    }
    return nodes;
  }
  return toNodes(root.folders, root.files);
}

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

  const isFolderOrProject =
    doc?.type === "folder" || doc?.type === "project";
  const tree = useMemo(
    () => (doc && isFolderOrProject ? buildShareTree(doc.children ?? []) : []),
    [isFolderOrProject, doc]
  );

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

  const proseClass = "share-markdown prose prose-sm max-w-none text-text prose-p:my-2 prose-p:leading-relaxed prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-text";

  if (isFolderOrProject) {
    const files = doc.children;
    const selectedFile =
      files.find((f) => f.id === selectedFileId) ?? files[0] ?? null;
    
    // Context value for internal link resolution
    const shareLinkContextValue: ShareLinkContextValue = {
      currentFilePath: selectedFile?.path ?? selectedFile?.name ?? "",
      files,
      onSelectFile: setSelectedFileId,
    };

    function renderTreeNodes(nodes: ShareTreeNode[], depth: number) {
      return nodes.map((node) => {
        if (node.type === "folder") {
          return (
            <li key={`folder-${depth}-${node.name}`} className="list-none">
              <div
                className="px-3 py-1.5 text-xs font-medium text-text-muted truncate"
                style={{ paddingLeft: 12 + depth * 12 }}
              >
                {node.name}
              </div>
              <ul className="space-y-0.5">
                {renderTreeNodes(node.children, depth + 1)}
              </ul>
            </li>
          );
        }
        const { file } = node;
        return (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => setSelectedFileId(file.id)}
              className={`w-full text-left py-2 text-sm rounded-md truncate transition-colors ${
                selectedFileId === file.id
                  ? "bg-accent/15 text-accent font-medium"
                  : "text-text hover:bg-bg"
              }`}
              style={{ paddingLeft: 12 + depth * 12 }}
            >
              {file.name}
            </button>
          </li>
        );
      });
    }

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
                <ul className="space-y-0.5">{renderTreeNodes(tree, 0)}</ul>
              )}
            </nav>
          </aside>
          <main className="flex-1 min-w-0 overflow-auto">
            {selectedFile ? (
              <ShareLinkContext.Provider value={shareLinkContextValue}>
                <div className="max-w-3xl mx-auto px-6 py-6">
                  <h2 className="text-lg font-semibold text-text mb-4 scroll-mt-4">
                    {selectedFile.name}
                  </h2>
                  <MarkdownContent
                    content={selectedFile.content_md ?? ""}
                    className={proseClass}
                    useShareLinks
                  />
                </div>
              </ShareLinkContext.Provider>
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
        <MarkdownContent content={doc.content_md ?? ""} className={proseClass} />
      </div>
    </div>
  );
}
