"use client";

import { Button, Input, Label, Modal } from "@/components/ui";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/trpc/client";

type MemberRole = "owner" | "admin" | "editor" | "viewer";
type Profile = { id: string; email: string | null; full_name: string | null; avatar_url: string | null } | null;
type MemberRow = { user_id: string; role: string; profiles: Profile };

export default function MembersPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const workspace = useWorkspace();
  const [inviteEmailOpen, setInviteEmailOpen] = useState(false);
  const [inviteLinkOpen, setInviteLinkOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("editor");
  const [linkRole, setLinkRole] = useState<"admin" | "editor" | "viewer">("editor");
  const [linkExpiresInDays, setLinkExpiresInDays] = useState(7);
  const [inviteResult, setInviteResult] = useState<{ added: boolean; inviteLink?: string } | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const { data: me } = trpc.user.me.useQuery();
  const currentUserId = me?.user?.id;
  const { data: members, refetch } = trpc.workspace.listMembers.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const inviteMember = trpc.workspace.inviteMember.useMutation({
    onSuccess: (r) => {
      setInviteResult(r.added ? { added: true } : { added: false, inviteLink: r.inviteLink });
      refetch();
    },
  });
  const createInviteLink = trpc.workspace.createInviteLink.useMutation({
    onSuccess: (r) => {
      setGeneratedLink(r.link ? `${typeof window !== "undefined" ? window.location.origin : ""}${r.link}` : null);
      refetch();
    },
  });
  const updateMemberRole = trpc.workspace.updateMemberRole.useMutation({ onSuccess: () => refetch() });
  const removeMember = trpc.workspace.removeMember.useMutation({ onSuccess: () => refetch() });

  const membersList = (members ?? []) as MemberRow[];
  const myMember = membersList.find((m) => m.user_id === currentUserId);
  const canManage = myMember?.role === "owner" || myMember?.role === "admin";

  const handleInviteByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !inviteEmail.trim()) return;
    setInviteResult(null);
    inviteMember.mutate({
      workspaceId: workspace.id,
      email: inviteEmail.trim(),
      role: inviteRole,
    });
  };

  const handleCreateInviteLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    setGeneratedLink(null);
    createInviteLink.mutate({
      workspaceId: workspace.id,
      role: linkRole,
      expiresInDays: linkExpiresInDays,
    });
  };

  const copyLink = () => {
    if (generatedLink) void navigator.clipboard.writeText(generatedLink);
  };

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => { setInviteEmailOpen(true); setInviteResult(null); setInviteEmail(""); }}>
            Invite by email
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => { setInviteLinkOpen(true); setGeneratedLink(null); }}>
            Copy invite link
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium text-text">Member</th>
              <th className="text-left p-3 font-medium text-text">Role</th>
              <th className="w-48 p-3 text-right font-medium text-text">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {membersList.map((m: MemberRow) => {
              const profile = m.profiles;
              const isOwner = m.role === "owner";
              const isSelf = profile?.id === currentUserId;
              return (
                <tr key={m.user_id} className="bg-bg">
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
                        {profile?.email && (
                          <span className="block text-xs text-text-muted">{profile.email}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={isOwner ? "font-medium text-text" : "text-text-muted"}>
                      {isOwner ? "Owner" : (m.role as string)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                      {!isOwner && (
                        <div className="flex items-center gap-1">
                          {isSelf ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (window.confirm("Leave this workspace?")) removeMember.mutate({ workspaceId: workspace.id, userId: m.user_id });
                              }}
                              disabled={removeMember.isPending}
                            >
                              Leave workspace
                            </Button>
                          ) : (
                            <>
                              <select
                                className="rounded border border-border bg-surface text-text text-sm px-2 py-1"
                                value={m.role}
                                onChange={(e) => {
                                  const role = e.target.value as MemberRole;
                                  if (role !== "owner") updateMemberRole.mutate({ workspaceId: workspace.id, userId: m.user_id, role });
                                }}
                                disabled={updateMemberRole.isPending}
                              >
                                <option value="admin">admin</option>
                                <option value="editor">editor</option>
                                <option value="viewer">viewer</option>
                              </select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  if (window.confirm("Remove this member from the workspace?")) removeMember.mutate({ workspaceId: workspace.id, userId: m.user_id });
                                }}
                                disabled={removeMember.isPending}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {inviteEmailOpen && (
        <Modal open onClose={() => setInviteEmailOpen(false)} title="Invite by email">
          <form onSubmit={handleInviteByEmail} className="space-y-3">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                className="w-full rounded border border-border bg-surface text-text px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              >
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            {inviteResult && (
              <p className="text-sm text-text-muted">
                {inviteResult.added ? "Member added." : "User not found. Share this link to sign up and join:"}
                {!inviteResult.added && inviteResult.inviteLink && (
                  <span className="block mt-1 font-mono text-xs break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}{inviteResult.inviteLink}
                  </span>
                )}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setInviteEmailOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMember.isPending}>{inviteMember.isPending ? "Inviting…" : "Invite"}</Button>
            </div>
          </form>
        </Modal>
      )}

      {inviteLinkOpen && (
        <Modal open onClose={() => setInviteLinkOpen(false)} title="Copy invite link">
          <form onSubmit={handleCreateInviteLink} className="space-y-3">
            <div>
              <Label htmlFor="link-role">Role</Label>
              <select
                id="link-role"
                className="w-full rounded border border-border bg-surface text-text px-3 py-2 text-sm"
                value={linkRole}
                onChange={(e) => setLinkRole(e.target.value as "admin" | "editor" | "viewer")}
              >
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            <div>
              <Label htmlFor="link-expires">Expires in (days)</Label>
              <Input
                id="link-expires"
                type="number"
                min={1}
                max={365}
                value={linkExpiresInDays}
                onChange={(e) => setLinkExpiresInDays(Number(e.target.value) || 7)}
              />
            </div>
            {generatedLink && (
              <div className="flex gap-2">
                <Input readOnly value={generatedLink} className="font-mono text-xs" />
                <Button type="button" variant="secondary" onClick={copyLink}>Copy</Button>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setInviteLinkOpen(false)}>Close</Button>
              <Button type="submit" disabled={createInviteLink.isPending}>
                {createInviteLink.isPending ? "Creating…" : "Create link"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
