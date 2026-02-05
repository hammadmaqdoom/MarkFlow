"use client";

import { Button, Input, Label, Modal } from "@/components/ui";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/trpc/client";

type Profile = { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
type TeamMemberRow = { id: string; user_id: string; role: string; profiles: Profile };

export default function TeamDetailPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const teamId = params.teamId as string;
  const workspace = useWorkspace();
  const router = useRouter();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"lead" | "member">("member");

  const { data: teamData, isLoading: teamLoading } = trpc.team.listByWorkspace.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const team = (teamData ?? []).find((t: { id: string }) => t.id === teamId) as { id: string; name: string; slug: string; description: string | null } | undefined;

  const { data: teamMembers, refetch: refetchMembers } = trpc.team.listMembers.useQuery(
    { teamId },
    { enabled: !!teamId }
  );
  const { data: workspaceMembers } = trpc.workspace.listMembers.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const addMember = trpc.team.addMember.useMutation({ onSuccess: () => { refetchMembers(); setAddMemberOpen(false); setSelectedUserId(""); } });
  const removeMember = trpc.team.removeMember.useMutation({ onSuccess: () => refetchMembers() });
  const updateMemberRole = trpc.team.updateMemberRole.useMutation({ onSuccess: () => refetchMembers() });
  const deleteTeam = trpc.team.delete.useMutation({
    onSuccess: () => router.push(`/w/${workspaceSlug}/settings/teams`),
  });

  const { data: me } = trpc.user.me.useQuery();
  const currentUserId = me?.user?.id;
  type WorkspaceMemberRow = { user_id: string; role: string; profiles: Profile | null };
  const workspaceMembersList = (workspaceMembers ?? []) as WorkspaceMemberRow[];
  const myWorkspaceMember = workspaceMembersList.find((m) => m.user_id === currentUserId);
  const myTeamMember = (teamMembers ?? []).find((m: TeamMemberRow) => m.user_id === currentUserId);
  const canManage =
    myWorkspaceMember?.role === "owner" ||
    myWorkspaceMember?.role === "admin" ||
    (myTeamMember?.role === "lead");

  const inTeamIds = new Set((teamMembers ?? []).map((m: TeamMemberRow) => m.user_id));
  const availableToAdd = workspaceMembersList.filter((m) => !inTeamIds.has(m.user_id));

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    addMember.mutate({ teamId, userId: selectedUserId, role: selectedRole });
  };

  if (teamLoading || !workspace) return null;
  if (!team) {
    return (
      <div className="p-6">
        <p className="text-text-muted">Team not found.</p>
        <Link href={`/w/${workspaceSlug}/settings/teams`} className="text-accent hover:underline text-sm mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/w/${workspaceSlug}/settings/teams`} className="text-sm text-text-muted hover:text-text mb-2 inline-block">
            ← Back to teams
          </Link>
          <h2 className="text-xl font-semibold text-text">{team.name}</h2>
          {team.description && <p className="text-sm text-text-muted mt-0.5">{team.description}</p>}
        </div>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (window.confirm(`Delete team "${team.name}"? This cannot be undone.`)) deleteTeam.mutate({ teamId });
            }}
            disabled={deleteTeam.isPending}
          >
            Delete team
          </Button>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-text">Members</h3>
          {canManage && availableToAdd.length > 0 && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setAddMemberOpen(true)}>
              Add member
            </Button>
          )}
        </div>
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-border">
              <tr>
                <th className="text-left p-3 font-medium text-text">Member</th>
                <th className="text-left p-3 font-medium text-text">Role</th>
                {canManage && <th className="w-24 p-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(teamMembers ?? []).map((m: TeamMemberRow) => {
                const profile = m.profiles;
                return (
                  <tr key={m.id} className="bg-bg">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-surface flex items-center justify-center text-text-muted text-xs font-medium">
                            {(profile?.full_name ?? profile?.email ?? "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-text">{profile?.full_name ?? "No name"}</span>
                          {profile?.email && <span className="block text-xs text-text-muted">{profile.email}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-text-muted">{m.role}</td>
                    {canManage && (
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <select
                            className="rounded border border-border bg-surface text-text text-sm px-2 py-1"
                            value={m.role}
                            onChange={(e) => {
                              const role = e.target.value as "lead" | "member";
                              updateMemberRole.mutate({ teamId, userId: m.user_id, role });
                            }}
                            disabled={updateMemberRole.isPending}
                          >
                            <option value="lead">lead</option>
                            <option value="member">member</option>
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              if (window.confirm("Remove this member from the team?")) removeMember.mutate({ teamId, userId: m.user_id });
                            }}
                            disabled={removeMember.isPending}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(teamMembers ?? []).length === 0 && (
          <p className="text-sm text-text-muted p-4">No members yet. Add workspace members to this team.</p>
        )}
      </div>

      {addMemberOpen && (
        <Modal open onClose={() => setAddMemberOpen(false)} title="Add team member">
          <form onSubmit={handleAddMember} className="space-y-3">
            <div>
              <Label htmlFor="add-user">Workspace member</Label>
              <select
                id="add-user"
                className="w-full rounded border border-border bg-surface text-text px-3 py-2 text-sm"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">Select a member</option>
                {availableToAdd.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {(m.profiles?.full_name ?? m.profiles?.email ?? m.user_id).toString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="add-role">Role</Label>
              <select
                id="add-role"
                className="w-full rounded border border-border bg-surface text-text px-3 py-2 text-sm"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as "lead" | "member")}
              >
                <option value="lead">lead</option>
                <option value="member">member</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addMember.isPending || !selectedUserId}>
                {addMember.isPending ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
