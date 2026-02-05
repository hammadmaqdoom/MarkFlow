"use client";

import { Button, Input, Label, Modal } from "@/components/ui";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@/trpc/client";

type TeamRow = { id: string; name: string; slug: string; description: string | null; member_count: number };

export default function TeamsPage() {
  const params = useParams();
  const workspaceSlug = params.workspaceSlug as string;
  const workspace = useWorkspace();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const { data: teamsRaw, refetch } = trpc.team.listByWorkspace.useQuery(
    { workspaceId: workspace?.id ?? "" },
    { enabled: !!workspace?.id }
  );
  const teams = (teamsRaw ?? []) as TeamRow[];
  const createTeam = trpc.team.create.useMutation({
    onSuccess: (data) => {
      refetch();
      setCreateOpen(false);
      setName("");
      setSlug("");
      setDescription("");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !name.trim()) return;
    createTeam.mutate({
      workspaceId: workspace.id,
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-text-muted text-sm">Create teams to group workspace members.</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
          Create team
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-3 font-medium text-text">Team</th>
              <th className="text-left p-3 font-medium text-text">Slug</th>
              <th className="text-left p-3 font-medium text-text">Members</th>
              <th className="w-20 p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {teams.map((t) => (
              <tr key={t.id} className="bg-bg">
                <td className="p-3">
                  <span className="font-medium text-text">{t.name}</span>
                  {t.description && (
                    <span className="block text-xs text-text-muted">{t.description}</span>
                  )}
                </td>
                <td className="p-3 text-text-muted">{t.slug}</td>
                <td className="p-3 text-text-muted">{t.member_count ?? 0}</td>
                <td className="p-3">
                  <Link
                    href={`/w/${workspaceSlug}/settings/teams/${t.id}`}
                    className="text-accent hover:underline text-sm"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {teams.length === 0 && (
        <p className="text-text-muted text-sm">No teams yet. Create one to get started.</p>
      )}

      {createOpen && (
        <Modal open onClose={() => setCreateOpen(false)} title="Create team">
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <Label htmlFor="team-name">Name</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="Engineering"
                required
              />
            </div>
            <div>
              <Label htmlFor="team-slug">Slug (optional)</Label>
              <Input
                id="team-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="engineering"
              />
            </div>
            <div>
              <Label htmlFor="team-description">Description (optional)</Label>
              <Input
                id="team-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product and engineering"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTeam.isPending}>
                {createTeam.isPending ? "Creating…" : "Create"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
