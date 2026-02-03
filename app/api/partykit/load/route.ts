import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const secret = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (process.env.PARTYKIT_SECRET && secret !== process.env.PARTYKIT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get("documentId");
  if (!documentId) {
    return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
  }
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("content_yjs")
      .eq("id", documentId)
      .eq("type", "file")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const row = data as { content_yjs?: Buffer } | null;
    if (!row?.content_yjs) {
      return NextResponse.json({}, { status: 404 });
    }
    const buf = row.content_yjs;
    const contentYjsBase64 = Buffer.from(buf).toString("base64");
    return NextResponse.json({ contentYjsBase64 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
