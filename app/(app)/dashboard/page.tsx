"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";

export default function DashboardPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery();

  useEffect(() => {
    if (isLoading || !workspaces) return;
    if (workspaces.length > 0) {
      const first = workspaces[0];
      if (first?.slug) router.replace(`/w/${first.slug}`);
    }
  }, [workspaces, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (workspaces && workspaces.length > 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-2xl font-semibold text-text">
          Welcome to MarkFlow
        </h1>
        <p className="text-text-muted">
          Create your first workspace to start documenting. Invite your
          co-founders and build in sync.
        </p>
        <OnboardingCreateWorkspace />
      </div>
    </div>
  );
}

function OnboardingCreateWorkspace() {
  const utils = trpc.useUtils();
  const router = useRouter();
  const create = trpc.workspace.create.useMutation({
    onSuccess: (data) => {
      utils.workspace.list.invalidate();
      router.push(`/w/${data.slug}`);
    },
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  return (
    <form
      className="flex flex-col gap-4 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate({ name: name || "My Workspace", slug: slug || undefined });
      }}
    >
      <div>
        <label htmlFor="workspace-name" className="block text-sm font-medium text-text mb-1">
          Workspace name
        </label>
        <input
          id="workspace-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
          }}
          placeholder="My Workspace"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="workspace-slug" className="block text-sm font-medium text-text mb-1">
          URL slug (optional)
        </label>
        <input
          id="workspace-slug"
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="my-workspace"
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? "Creating…" : "Create workspace"}
      </Button>
      {create.isError && (
        <p className="text-sm text-red-600" role="alert">
          {create.error.message}
        </p>
      )}
    </form>
  );
}
