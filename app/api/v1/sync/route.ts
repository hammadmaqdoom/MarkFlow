import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

async function assertEditorOrOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workspaceId: string
): Promise<void> {
  const { data: w } = await supabase.from("workspaces").select("owner_id").eq("id", workspaceId).single();
  if (w?.owner_id === userId) return;
  const { data: m } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();
  if (m?.role && ["owner", "admin", "editor"].includes(m.role)) return;
  throw new Error("Forbidden");
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const projectId = typeof body?.projectId === "string" ? body.projectId : null;
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", projectId)
      .single();
    if (projErr || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await assertEditorOrOwner(supabase, user.id, project.workspace_id);

    await inngest.send({
      name: "markflow/sync",
      data: { projectId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
