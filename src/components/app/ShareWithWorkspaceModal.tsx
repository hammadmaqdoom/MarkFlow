"use client";

import { Button, Label, Modal } from "@/components/ui";
import { trpc } from "@/trpc/client";

export function ShareWithWorkspaceModal({
  projectId,
  currentWorkspaceId,
  open,
  onClose,
}: {
  projectId: string;
  currentWorkspaceId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { data: workspaces } = trpc.workspace.list.useQuery(undefined, { enabled: open });
  const { data: grants, refetch } = trpc.projectGrant.listGrantsForProject.useQuery(
    { projectId },
    { enabled: open && !!projectId }
  );
  const grantToWorkspace = trpc.projectGrant.grantToWorkspace.useMutation({
    onSuccess: () => refetch(),
  });
  const revokeGrant = trpc.projectGrant.revokeGrant.useMutation({
    onSuccess: () => refetch(),
  });

  const otherWorkspaces = (workspaces ?? []).filter((w: { id: string }) => w.id !== currentWorkspaceId);

  const handleGrant = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const workspaceId = (form.elements.namedItem("grant-workspace") as HTMLSelectElement)?.value;
    const role = (form.elements.namedItem("grant-role") as HTMLSelectElement)?.value as "view" | "edit";
    if (!workspaceId || !role) return;
    grantToWorkspace.mutate({ projectId, workspaceId, role }, {
      onSuccess: () => {
        (form.elements.namedItem("grant-workspace") as HTMLSelectElement).value = "";
        (form.elements.namedItem("grant-role") as HTMLSelectElement).value = "view";
      },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Share with workspace">
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-sm font-medium text-text mb-2">Grant access to another workspace</h3>
          <form onSubmit={handleGrant} className="space-y-2">
            <div>
              <Label htmlFor="grant-workspace">Workspace</Label>
              <select
                id="grant-workspace"
                name="grant-workspace"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
                required
              >
                <option value="">Select workspace</option>
                {otherWorkspaces.map((w: { id: string; name: string }) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="grant-role">Role</Label>
              <select
                id="grant-role"
                name="grant-role"
                className="w-full rounded border border-border bg-surface px-3 py-2 text-sm text-text"
              >
                <option value="view">View only</option>
                <option value="edit">Can edit</option>
              </select>
            </div>
            <Button type="submit" disabled={grantToWorkspace.isPending || otherWorkspaces.length === 0}>
              {grantToWorkspace.isPending ? "Granting…" : "Grant access"}
            </Button>
          </form>
        </div>
        <div>
          <h3 className="text-sm font-medium text-text mb-2">Shared with</h3>
          {(grants ?? []).length === 0 ? (
            <p className="text-sm text-text-muted">No other workspaces have access.</p>
          ) : (
            <ul className="space-y-2">
              {((grants ?? []) as Array<{ workspace_id: string; workspace_name: string; workspace_slug: string; role: string }>).map((g) => (
                <li key={g.workspace_id} className="flex items-center justify-between rounded border border-border px-3 py-2 text-sm">
                  <span className="text-text">{g.workspace_name}</span>
                  <span className="text-text-muted">{g.role}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (window.confirm("Revoke access for this workspace?")) revokeGrant.mutate({ projectId, workspaceId: g.workspace_id });
                    }}
                    disabled={revokeGrant.isPending}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
