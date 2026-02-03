import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, getClientIdentifier } from "@/server/lib/rate-limit";
import { NextResponse } from "next/server";

const AUTH_CALLBACK_LIMIT = 30;
const AUTH_CALLBACK_WINDOW_MS = 60_000;

export async function GET(request: Request) {
  const clientId = getClientIdentifier(request) ?? "unknown";
  const key = `auth:callback:${clientId}`;
  const result = checkRateLimit(key, AUTH_CALLBACK_LIMIT, AUTH_CALLBACK_WINDOW_MS);
  if (!result.ok) {
    return new NextResponse("Too Many Requests", { status: 429 });
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/w";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
