import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportCreateSchema } from "@/server/api/schemas/export";
import {
  assertProjectMember,
  checkExportRateLimit,
  createExportJob,
} from "@/server/lib/export";

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
    const parsed = exportCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

    await assertProjectMember(supabase, user.id, parsed.data.projectId);
    checkExportRateLimit(user.id);

    const jobId = createExportJob(parsed.data.projectId, user.id, idempotencyKey);
    return NextResponse.json({ jobId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    if (message === "Project not found")
      return NextResponse.json({ error: message }, { status: 404 });
    if (message === "Forbidden")
      return NextResponse.json({ error: message }, { status: 403 });
    if (message.startsWith("Too many"))
      return NextResponse.json({ error: message }, { status: 429 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
