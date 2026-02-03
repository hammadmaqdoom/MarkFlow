import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPassword } from "@/server/trpc/routers/shareLink";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token?.trim();
  if (!token) {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password") ?? undefined;

  const supabase = createServiceClient();

  function checkExpiryAndPassword(row: {
    expires_at: string | null;
    scope: string;
    password_hash: string | null;
  }): Response | null {
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return Response.json({ error: "Link expired" }, { status: 404 });
    }
    if (row.scope === "password") {
      if (!row.password_hash) {
        return Response.json({ error: "Password required" }, { status: 401 });
      }
      if (!password || !verifyPassword(password, row.password_hash)) {
        return Response.json({ error: "Invalid password" }, { status: 401 });
      }
    }
    return null;
  }

  const { data: link, error: linkError } = await supabase
    .from("share_links")
    .select("id, document_id, scope, password_hash, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!linkError && link) {
    const row = link as {
      document_id: string;
      expires_at: string | null;
      scope: string;
      password_hash: string | null;
    };
    const err = checkExpiryAndPassword(row);
    if (err) return err;

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, name, content_md, type, path, project_id")
      .eq("id", row.document_id)
      .single();

    if (docError || !doc) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const docRow = doc as {
      id: string;
      name: string;
      content_md: string | null;
      type: string;
      path: string;
      project_id: string;
    };

    if (docRow.type === "folder") {
      const prefix = docRow.path ? `${docRow.path}/` : "";
      const { data: children, error: childrenError } = await supabase
        .from("documents")
        .select("id, name, path, content_md")
        .eq("project_id", docRow.project_id)
        .eq("type", "file")
        .like("path", `${prefix}%`)
        .order("path");

      if (childrenError) {
        return Response.json({ error: "Failed to load folder contents" }, { status: 500 });
      }

      const files = (children ?? []).map((f: { id: string; name: string; path: string; content_md: string | null }) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        content_md: f.content_md ?? "",
      }));

      return Response.json({
        type: "folder",
        id: docRow.id,
        name: docRow.name,
        children: files,
      });
    }

    return Response.json({
      type: "file",
      id: docRow.id,
      name: docRow.name,
      content_md: docRow.content_md ?? "",
    });
  }

  const { data: projectLink, error: projectLinkError } = await supabase
    .from("project_share_links")
    .select("id, project_id, scope, password_hash, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (projectLinkError || !projectLink) {
    return Response.json({ error: "Link not found or expired" }, { status: 404 });
  }

  const prow = projectLink as {
    project_id: string;
    expires_at: string | null;
    scope: string;
    password_hash: string | null;
  };
  const err = checkExpiryAndPassword(prow);
  if (err) return err;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", prow.project_id)
    .single();

  if (projectError || !project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const { data: filesData, error: filesError } = await supabase
    .from("documents")
    .select("id, name, path, content_md")
    .eq("project_id", prow.project_id)
    .eq("type", "file")
    .order("path");

  if (filesError) {
    return Response.json({ error: "Failed to load project contents" }, { status: 500 });
  }

  const files = (filesData ?? []).map((f: { id: string; name: string; path: string; content_md: string | null }) => ({
    id: f.id,
    name: f.name,
    path: f.path,
    content_md: f.content_md ?? "",
  }));

  return Response.json({
    type: "project",
    id: (project as { id: string; name: string }).id,
    name: (project as { id: string; name: string }).name,
    children: files,
  });
}
