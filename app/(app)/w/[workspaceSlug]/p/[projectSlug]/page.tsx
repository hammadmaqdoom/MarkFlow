"use client";

import { useProject } from "@/contexts/ProjectContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";

export default function ProjectPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const project = useProject();
  const { data: projectData, isLoading } = trpc.project.getById.useQuery(
    { projectId: project?.id ?? "", includeTree: true },
    { enabled: !!project?.id }
  );

  if (!project) return null;

  const documents = projectData && "documents" in projectData
    ? ((projectData as { documents?: { id: string; parent_id: string | null; type: string; name: string; path: string }[] }).documents ?? [])
    : [];
  const rootDocs = documents.filter((d) => !d.parent_id);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text mb-1">{project.name}</h1>
      {projectData?.description && (
        <p className="text-text-muted text-sm mb-6">{projectData.description}</p>
      )}
      <p className="text-text-muted text-sm mb-4">
        Select a document from the sidebar or create one to get started.
      </p>
      {isLoading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      ) : (
        <ul className="space-y-1">
          {rootDocs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/w/${workspaceSlug}/p/${projectSlug}/doc/${d.id}`}
                className="block rounded px-3 py-2 text-sm text-text-muted hover:bg-surface hover:text-text"
              >
                {d.type === "folder" ? "📁" : "📄"} {d.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
