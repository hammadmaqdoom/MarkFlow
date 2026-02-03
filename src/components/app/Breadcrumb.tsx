"use client";

import Link from "next/link";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useProject } from "@/contexts/ProjectContext";

export interface BreadcrumbProps {
  documentName?: string | null;
  documentId?: string | null;
}

const sep = <span className="mx-1.5 text-text-muted">/</span>;

export function Breadcrumb({ documentName, documentId }: BreadcrumbProps) {
  const workspace = useWorkspace();
  const project = useProject();

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm min-w-0">
      <Link
        href="/dashboard"
        className="text-text-muted hover:text-text truncate max-w-[8rem]"
      >
        Home
      </Link>
      {workspace && (
        <>
          {sep}
          <Link
            href={`/w/${workspace.slug}`}
            className="text-text-muted hover:text-text truncate max-w-[8rem]"
          >
            {workspace.name}
          </Link>
        </>
      )}
      {project && (
        <>
          {sep}
          <Link
            href={`/w/${workspace?.slug ?? ""}/p/${project.slug}`}
            className="text-text-muted hover:text-text truncate max-w-[8rem]"
          >
            {project.name}
          </Link>
        </>
      )}
      {documentId && (
        <>
          {sep}
          <Link
            href={`/w/${workspace?.slug ?? ""}/p/${project?.slug ?? ""}/doc/${documentId}`}
            className="text-text truncate max-w-[12rem] font-medium"
          >
            {documentName ?? "Document"}
          </Link>
        </>
      )}
    </nav>
  );
}
