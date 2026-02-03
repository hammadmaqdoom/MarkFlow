import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", "/api/auth/github/connect");
    return NextResponse.redirect(url);
  }
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth not configured" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/github/callback`;
  const state = encodeURIComponent(next);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "repo",
    state,
  });
  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
