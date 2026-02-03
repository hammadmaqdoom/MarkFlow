import { inngest } from "./client";
import { syncProjectFromGitHub } from "@/server/lib/github-sync";

/**
 * GitHub push webhook: find projects linked to this repo and trigger sync.
 */
export const githubSync = inngest.createFunction(
  { id: "github-sync", retries: 2 },
  { event: "github/push" },
  async ({ event, step }) => {
    const { repository, ref } = event.data as { repository?: { full_name?: string }; ref?: string };
    const fullName = repository?.full_name;
    if (!fullName) return { ok: true };
    const branch = ref?.replace("refs/heads/", "") ?? "main";
    const { createServiceClient } = await import("@/lib/supabase/service");
    const supabase = createServiceClient();
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("github_repo", fullName)
      .eq("sync_enabled", true);
    const list = (projects ?? []) as { id: string }[];
    for (const p of list) {
      await step.run("sync-" + p.id, () => syncProjectFromGitHub(p.id));
    }
    return { ok: true };
  }
);

/**
 * Manual project sync: load project, fetch GitHub tree, upsert documents.
 */
export const projectSync = inngest.createFunction(
  { id: "project-sync", retries: 2 },
  { event: "markflow/sync" },
  async ({ event }) => {
    const { projectId } = event.data as { projectId: string };
    return syncProjectFromGitHub(projectId);
  }
);
