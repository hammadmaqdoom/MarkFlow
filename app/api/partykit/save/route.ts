import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (process.env.PARTYKIT_SECRET && secret !== process.env.PARTYKIT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { documentId?: string; contentYjsBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { documentId, contentYjsBase64 } = body;
  if (!documentId || !contentYjsBase64) {
    return NextResponse.json({ error: "Missing documentId or contentYjsBase64" }, { status: 400 });
  }
  try {
    const supabase = createServiceClient();
    const buf = Buffer.from(contentYjsBase64, "base64");
    // @ts-expect-error - documents.content_yjs (bytea) is valid; Supabase types may not include it
    const { error } = await supabase.from("documents").update({ content_yjs: buf }).eq("id", documentId).eq("type", "file");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
