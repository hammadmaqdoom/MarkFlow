import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { decryptGitHubToken } from "@/lib/github-encrypt";
import type { Context } from "../context";
import { protectedProcedure, router } from "../trpc";

async function getDecryptedToken(ctx: Context): Promise<string> {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
  const { data, error } = await ctx.supabase.from("profiles").select("github_token_encrypted").eq("id", ctx.user.id).maybeSingle();
  if (error || !data) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect GitHub first" });
  }
  const row = data as { github_token_encrypted?: string };
  if (!row.github_token_encrypted) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Connect GitHub first" });
  }
  try {
    return decryptGitHubToken(row.github_token_encrypted);
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid stored token" });
  }
}

export const githubRouter = router({
  listRepos: protectedProcedure.query(async ({ ctx }) => {
    const token = await getDecryptedToken(ctx);
    const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "GitHub API error" });
    }
    const repos = (await res.json()) as { full_name: string; default_branch: string }[];
    return repos.map((r) => ({ fullName: r.full_name, defaultBranch: r.default_branch }));
  }),

  listBranches: protectedProcedure
    .input(z.object({ repo: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const token = await getDecryptedToken(ctx);
      const res = await fetch(
        `https://api.github.com/repos/${input.repo}/branches?per_page=100`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" } }
      );
      if (!res.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "GitHub API error" });
      }
      const branches = (await res.json()) as { name: string }[];
      return branches.map((b) => b.name);
    }),
});
