"use client";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const workspaceSlug = params.workspaceSlug as string;
  const workspace = useWorkspace();
  const base = `/w/${workspaceSlug}/settings`;
  const membersActive = pathname === `${base}/members` || pathname === base;
  const teamsActive = pathname === `${base}/teams` || pathname?.startsWith(`${base}/teams/`);

  if (!workspace) return null;

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-text mb-1">Workspace settings</h1>
      <p className="text-text-muted text-sm mb-6">
        Manage members and teams for {workspace.name}.
      </p>
      <nav className="flex gap-4 border-b border-border mb-6" aria-label="Settings tabs">
        <Link
          href={`${base}/members`}
          className={`pb-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            membersActive
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Members
        </Link>
        <Link
          href={`${base}/teams`}
          className={`pb-3 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            teamsActive
              ? "border-accent text-accent"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Teams
        </Link>
      </nav>
      {children}
    </div>
  );
}
