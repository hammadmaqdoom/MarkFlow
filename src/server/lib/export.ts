import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertProjectMember(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ workspaceId: string }> {
  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", projectId)
    .single();
  if (projErr || !project) throw new Error("Project not found");
  const { data: ws } = await supabase.from("workspaces").select("owner_id").eq("id", project.workspace_id).single();
  if (ws?.owner_id === userId) return { workspaceId: project.workspace_id };
  const { data: member } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", userId)
    .single();
  if (member?.role) return { workspaceId: project.workspace_id };
  throw new Error("Forbidden");
}

export type ExportFile = { path: string; name: string; content: string | null };

export async function gatherFilesForExport(
  supabase: SupabaseClient,
  projectId: string
): Promise<ExportFile[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("path, name, content_md")
    .eq("project_id", projectId)
    .eq("type", "file");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    path: row.path,
    name: row.name,
    content: row.content_md ?? "",
  }));
}

export function buildManifest(files: ExportFile[]): { path: string; name: string }[] {
  return files.map(({ path, name }) => ({ path, name }));
}

export async function buildZip(files: ExportFile[], manifest: { path: string; name: string }[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  for (const f of files) {
    zip.file(f.path, f.content ?? "");
  }
  const blob = await zip.generateAsync({ type: "nodebuffer" });
  return Buffer.from(blob);
}

const EXPORT_RATE_LIMIT_PER_MIN = 10;
const exportCountByUser = new Map<string, { count: number; resetAt: number }>();

export function checkExportRateLimit(userId: string): void {
  const now = Date.now();
  const windowMs = 60_000;
  let entry = exportCountByUser.get(userId);
  if (!entry) {
    exportCountByUser.set(userId, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (now >= entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return;
  }
  entry.count += 1;
  if (entry.count > EXPORT_RATE_LIMIT_PER_MIN) {
    throw new Error("Too many export requests. Try again in a minute.");
  }
}

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const jobStore = new Map<
  string,
  { projectId: string; userId: string; createdAt: number }
>();
const idempotencyStore = new Map<string, string>(); // idempotencyKey -> jobId

export function createExportJob(projectId: string, userId: string, idempotencyKey?: string): string {
  if (idempotencyKey) {
    const existing = idempotencyStore.get(idempotencyKey);
    if (existing) {
      const job = jobStore.get(existing);
      if (job && job.userId === userId && job.projectId === projectId) return existing;
    }
  }
  const jobId = crypto.randomUUID();
  jobStore.set(jobId, { projectId, userId, createdAt: Date.now() });
  if (idempotencyKey) idempotencyStore.set(idempotencyKey, jobId);
  return jobId;
}

export function getExportJob(jobId: string): { projectId: string; userId: string } | null {
  const job = jobStore.get(jobId);
  if (!job) return null;
  if (Date.now() - job.createdAt > JOB_TTL_MS) {
    jobStore.delete(jobId);
    return null;
  }
  return { projectId: job.projectId, userId: job.userId };
}
