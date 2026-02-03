import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";

function verifyGitHubSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyGitHubSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { repository?: { full_name?: string }; ref?: string };
  try {
    payload = JSON.parse(rawBody) as { repository?: { full_name?: string }; ref?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await inngest.send({
    name: "github/push",
    data: {
      repository: payload.repository,
      ref: payload.ref,
    },
  });

  return new NextResponse(null, { status: 200 });
}
