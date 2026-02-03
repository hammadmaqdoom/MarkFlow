import { createServerClient } from "@supabase/ssr";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { getClientIdentifier } from "@/server/lib/rate-limit";

function getCookiesFromRequest(req: Request): { name: string; value: string }[] {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return [];
  return cookieHeader.split("; ").map((part) => {
    const [name, ...rest] = part.split("=");
    return { name: name!, value: rest.join("=").trim() };
  });
}

export async function createContext(opts: FetchCreateContextFnOptions) {
  const clientId = getClientIdentifier(opts.req) ?? "unknown";
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getCookiesFromRequest(opts.req);
        },
        setAll(cookiesToSet: { name: string; value: string; options?: { path?: string; maxAge?: number } }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            opts.resHeaders.append(
              "Set-Cookie",
              `${name}=${value}; Path=${options?.path ?? "/"}${options?.maxAge ? `; Max-Age=${options.maxAge}` : ""}`
            )
          );
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
    clientId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
