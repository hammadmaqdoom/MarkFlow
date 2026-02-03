import { initTRPC, TRPCError } from "@trpc/server";
import { checkRateLimit } from "@/server/lib/rate-limit";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const key = `trpc:${ctx.user?.id ?? ctx.clientId}`;
  const result = checkRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!result.ok) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil(result.retryAfterMs / 1000)}s`,
    });
  }
  return next({ ctx });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(rateLimitMiddleware);
export const protectedProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  });
