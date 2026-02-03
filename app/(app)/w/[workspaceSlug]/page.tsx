"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import { trpc } from "@/trpc/client";

export default function WorkspacePage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const workspace = useWorkspace();
  const { data: projects, isLoading } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );

  if (!workspace) return null;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text mb-1">
        {workspace.name}
      </h1>
      <p className="text-text-muted text-sm mb-6">
        Select a project from the sidebar or create one to get started.
      </p>
      {isLoading ? (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      ) : (
        <ul className="space-y-2">
          {(projects ?? []).map((p) => (
            <li key={p.id}>
              <Link
                href={`/w/${workspaceSlug}/p/${p.slug}`}
                className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-bg text-text"
              >
                <span className="font-medium">{p.name}</span>
                {p.description && (
                  <span className="block text-sm text-text-muted mt-0.5">
                    {p.description}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
