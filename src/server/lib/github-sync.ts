/**
 * GitHub sync: fetch repo tree and upsert documents by path.
 * Used by Inngest projectSync.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptGitHubToken } from "@/lib/github-encrypt";
import { normalizePath, pathFromParentAndName } from "./path";

export async function syncProjectFromGitHub(projectId: string): Promise<{ ok: boolean; filesProcessed?: number; error?: string }> {
  const supabase = createServiceClient();

  const { data, error: projErr } = await supabase
    .from("projects")
    .select("id, workspace_id, github_repo, github_branch")
    .eq("id", projectId)
    .single();
  if (projErr || !data) {
    return { ok: false, error: "Project not found" };
  }
  const project = data as { id: string; workspace_id: string; github_repo: string | null; github_branch: string | null };
  if (!project.github_repo) {
    return { ok: false, error: "Project has no GitHub repo" };
  }

  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single();
  const workspace = ws as { owner_id?: string } | null;
  if (!workspace?.owner_id) {
    return { ok: false, error: "Workspace owner not found" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("github_token_encrypted")
    .eq("id", workspace.owner_id)
    .single();
  const enc = profile as { github_token_encrypted?: string } | null;
  if (!enc?.github_token_encrypted) {
    return { ok: false, error: "Owner has no GitHub token" };
  }

  let token: string;
  try {
    token = decryptGitHubToken(enc.github_token_encrypted);
  } catch {
    return { ok: false, error: "Invalid stored token" };
  }

  const branch = project.github_branch ?? "main";
  const repo = project.github_repo;

  const tree = await fetchGitHubTree(token, repo, branch);
  if (!tree) {
    return { ok: false, error: "Failed to fetch GitHub tree" };
  }

  const mdFiles = tree.filter((e) => e.type === "blob" && e.path?.endsWith(".md"));
  let processed = 0;
  for (const entry of mdFiles) {
    const path = normalizePath(entry.path!);
    const result = await fetchGitHubFileContent(token, repo, branch, entry.path!);
    if (result === null) continue;
    const name = path.split("/").pop() ?? "document.md";
    await upsertDocumentByPath(supabase, projectId, path, name, result.content, path, result.sha);
    processed += 1;
  }

  // @ts-expect-error - projects table types may not include last_synced_at
  await supabase.from("projects").update({ last_synced_at: new Date().toISOString() }).eq("id", projectId);

  return { ok: true, filesProcessed: processed };
}

type TreeEntry = { path?: string; type: string; sha?: string };

async function fetchGitHubTree(token: string, repo: string, branch: string): Promise<TreeEntry[] | null> {
  const refRes = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!refRes.ok) return null;
  const refData = (await refRes.json()) as { object?: { sha?: string } };
  const commitSha = refData.object?.sha;
  if (!commitSha) return null;

  const commitRes = await fetch(`https://api.github.com/repos/${repo}/git/commits/${commitSha}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!commitRes.ok) return null;
  const commitData = (await commitRes.json()) as { tree?: { sha?: string } };
  const treeSha = commitData.tree?.sha;
  if (!treeSha) return null;

  const treeRes = await fetch(`https://api.github.com/repos/${repo}/git/trees/${treeSha}?recursive=1`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
  });
  if (!treeRes.ok) return null;
  const treeData = (await treeRes.json()) as { tree?: TreeEntry[] };
  return treeData.tree ?? null;
}

async function fetchGitHubFileContent(
  token: string,
  repo: string,
  branch: string,
  path: string
): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string; encoding?: string; sha?: string };
  const sha = data.sha ?? "";
  if (data.encoding === "base64" && data.content) {
    return { content: Buffer.from(data.content, "base64").toString("utf8"), sha };
  }
  if (typeof data.content === "string") {
    return { content: data.content, sha };
  }
  return null;
}

async function upsertDocumentByPath(
  supabase: SupabaseClient,
  projectId: string,
  path: string,
  name: string,
  contentMd: string,
  githubPath: string,
  githubSha: string
): Promise<void> {
  const parts = path.split("/").filter(Boolean);
  let parentId: string | null = null;
  let currentPath = "";

  for (let i = 0; i < parts.length; i++) {
    const segment = parts[i]!;
    const isFile = i === parts.length - 1 && segment.endsWith(".md");
    currentPath = pathFromParentAndName(currentPath || null, segment);
    if (!currentPath) continue;

    const { data: existing } = await supabase
      .from("documents")
      .select("id, type")
      .eq("project_id", projectId)
      .eq("path", currentPath)
      .maybeSingle();

    if (existing) {
      parentId = existing.id;
      if (isFile && existing.type === "file") {
        await supabase
          .from("documents")
          .update({ content_md: contentMd, github_path: githubPath, github_sha: githubSha })
          .eq("id", existing.id);
      }
      continue;
    }

    const { data: inserted } = await supabase
      .from("documents")
      .insert({
        project_id: projectId,
        parent_id: parentId,
        type: isFile ? "file" : "folder",
        name: segment,
        path: currentPath,
        ...(isFile ? { content_md: contentMd, github_path: githubPath, github_sha: githubSha } : {}),
      })
      .select("id")
      .single();
    const row = inserted as { id: string } | null;
    if (row) parentId = row.id;
  }
}
