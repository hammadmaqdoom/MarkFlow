"use client";

import { createContext, useContext, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { resolveDocPath, isInternalDocLink } from "@/lib/resolvePath";
import type { Components } from "react-markdown";

/**
 * Context for document linking - provides info needed to resolve internal links
 */
interface DocumentLinkContextValue {
  /** Current document's path (e.g., "docs/getting-started.md") */
  currentPath: string;
  /** Project ID for looking up documents by path */
  projectId: string;
  /** Workspace slug for building URLs */
  workspaceSlug: string;
  /** Project slug for building URLs */
  projectSlug: string;
}

const DocumentLinkContext = createContext<DocumentLinkContextValue | null>(null);

export function DocumentLinkProvider({
  children,
  currentPath,
  projectId,
  workspaceSlug,
  projectSlug,
}: DocumentLinkContextValue & { children: React.ReactNode }) {
  const value = useMemo(
    () => ({ currentPath, projectId, workspaceSlug, projectSlug }),
    [currentPath, projectId, workspaceSlug, projectSlug]
  );
  return (
    <DocumentLinkContext.Provider value={value}>
      {children}
    </DocumentLinkContext.Provider>
  );
}

export function useDocumentLinkContext() {
  return useContext(DocumentLinkContext);
}

/**
 * Custom link component for ReactMarkdown that handles internal document links
 */
export function DocumentLinkComponent({
  href,
  title,
  children,
  className,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const ctx = useDocumentLinkContext();
  const router = useRouter();

  // Determine link type
  const isExternal = href?.startsWith("http://") || href?.startsWith("https://");
  const isAnchor = href?.startsWith("#");
  const isInternal = href && isInternalDocLink(href);

  // Resolve the path for internal links
  const resolvedPath = useMemo(() => {
    if (!isInternal || !href || !ctx) return null;
    return resolveDocPath(ctx.currentPath, href);
  }, [isInternal, href, ctx]);

  // Look up the document by path
  const { data: targetDoc, isLoading } = trpc.document.getByPath.useQuery(
    { projectId: ctx?.projectId ?? "", path: resolvedPath ?? "" },
    {
      enabled: Boolean(isInternal && resolvedPath && ctx?.projectId),
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      retry: false, // Don't retry on 404
    }
  );

  // Build the internal URL - check that targetDoc is valid (has id property)
  const internalUrl = useMemo(() => {
    if (!targetDoc || !ctx) return null;
    // Type guard: ensure targetDoc has an id (not an error response)
    if (!("id" in targetDoc) || typeof targetDoc.id !== "string") return null;
    return `/w/${ctx.workspaceSlug}/p/${ctx.projectSlug}/doc/${targetDoc.id}`;
  }, [targetDoc, ctx]);

  // Handle click for internal links
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (isInternal && internalUrl) {
        e.preventDefault();
        router.push(internalUrl);
      }
    },
    [isInternal, internalUrl, router]
  );

  // Base classes
  const baseClass = "text-accent transition-colors";
  const linkClass = [
    className,
    baseClass,
    isAnchor ? "hover:underline cursor-pointer" : undefined,
    isExternal ? "no-underline hover:underline" : undefined,
    isInternal ? "hover:underline cursor-pointer" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

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

  // Anchor link (same-page navigation)
  if (isAnchor) {
    return (
      <a href={href} title={title ?? undefined} className={linkClass} {...props}>
        {children}
      </a>
    );
  }

  // Internal document link
  if (isInternal && ctx) {
    // Loading state
    if (isLoading) {
      return (
        <span className={`${baseClass} opacity-70`} title="Loading link...">
          {children}
        </span>
      );
    }

    // Document found - render as Next.js Link
    if (internalUrl) {
      return (
        <Link
          href={internalUrl}
          title={title ?? `Open ${resolvedPath}`}
          className={linkClass}
          onClick={handleClick}
          {...props}
        >
          {children}
        </Link>
      );
    }

    // Document not found - show broken link indicator
    return (
      <span
        className="text-red-500 line-through cursor-not-allowed"
        title={`Document not found: ${resolvedPath}`}
      >
        {children}
      </span>
    );
  }

  // Fallback: render as plain anchor
  return (
    <a href={href} title={title ?? undefined} className={linkClass} {...props}>
      {children}
    </a>
  );
}

/**
 * Get markdown components with document linking support
 * Use this with ReactMarkdown: <ReactMarkdown components={getDocumentLinkComponents()} />
 */
export function getDocumentLinkComponents(): Partial<Components> {
  return {
    a: DocumentLinkComponent as Components["a"],
  };
}
