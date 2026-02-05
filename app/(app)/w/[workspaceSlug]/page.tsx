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
  const { data: sharedWithUs } = trpc.projectGrant.listSharedWithUs.useQuery(
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

      {(sharedWithUs ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Shared with us</h2>
          <ul className="space-y-2">
            {sharedWithUs?.map((s: { projectId: string; projectName: string; projectSlug: string; sourceWorkspaceSlug: string; role: string }) => (
              <li key={s.projectId}>
                <Link
                  href={`/w/${s.sourceWorkspaceSlug}/p/${s.projectSlug}`}
                  className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-bg text-text"
                >
                  <span className="font-medium">{s.projectName}</span>
                  <span className="block text-sm text-text-muted mt-0.5">
                    From workspace: {s.sourceWorkspaceSlug} · {s.role}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Projects</h2>
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
