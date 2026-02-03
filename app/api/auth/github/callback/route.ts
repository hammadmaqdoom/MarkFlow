import { createClient } from "@/lib/supabase/server";
import { encryptGitHubToken } from "@/lib/github-encrypt";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const state = searchParams.get("state");
  const next = state ? decodeURIComponent(state) : "/dashboard";
  const origin = new URL(request.url).origin;

  if (errorParam || !code) {
    return NextResponse.redirect(`${origin}/dashboard?github=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login?next=${encodeURIComponent(`/api/auth/github/callback?code=${code}`)}`);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/dashboard?github=config`);
  }

  const redirectUri = `${origin}/api/auth/github/callback`;
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenData.access_token) {
    return NextResponse.redirect(`${origin}/dashboard?github=token`);
  }

  try {
    const encrypted = encryptGitHubToken(tokenData.access_token);
    await supabase.from("profiles").update({ github_token_encrypted: encrypted }).eq("id", user.id);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard?github=encrypt`);
  }

  return NextResponse.redirect(`${origin}${next}?github=connected`);
}
