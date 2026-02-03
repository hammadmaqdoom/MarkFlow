import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  assertProjectMember,
  buildManifest,
  buildZip,
  gatherFilesForExport,
  getExportJob,
} from "@/server/lib/export";
import { checkRateLimit } from "@/server/lib/rate-limit";

const EXPORT_RATE_LIMIT = 10;
const EXPORT_WINDOW_MS = 60_000;

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const key = `export:${user.id}`;
    const limitResult = checkRateLimit(key, EXPORT_RATE_LIMIT, EXPORT_WINDOW_MS);
    if (!limitResult.ok) {
      return NextResponse.json(
        { error: "Too many export requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limitResult.retryAfterMs / 1000)) } }
      );
    }

    const job = getExportJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found or expired" }, { status: 404 });
    }
    if (job.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await assertProjectMember(supabase, user.id, job.projectId);
    const files = await gatherFilesForExport(supabase, job.projectId);
    const manifest = buildManifest(files);
    const zipBuffer = await buildZip(files, manifest);

    const filename = `markflow-export-${job.projectId.slice(0, 8)}.zip`;
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    if (message === "Project not found")
      return NextResponse.json({ error: message }, { status: 404 });
    if (message === "Forbidden")
      return NextResponse.json({ error: message }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
