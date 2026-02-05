import { randomBytes } from "crypto";
import { z } from "zod";
import { hashApiKey } from "@/server/lib/api-key";
import { protectedProcedure, router } from "../trpc";

const updateProfileSchema = z.object({
  full_name: z.string().min(0).max(256).optional(),
  avatar_url: z.string().url().optional().nullable(),
  editor_preference: z.enum(["wysiwyg", "markdown", "split"]).optional(),
});

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const { data: profile, error } = await ctx.supabase
      .from("profiles")
      .select("*")
      .eq("id", ctx.user.id)
      .single();

    if (error || !profile) {
      return {
        user: ctx.user,
        profile: null,
      };
    }

    return {
      user: ctx.user,
      profile,
    };
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.supabase
        .from("profiles")
        .update({
          ...(input.full_name !== undefined && { full_name: input.full_name }),
          ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url }),
          ...(input.editor_preference !== undefined && {
            editor_preference: input.editor_preference,
          }),
        })
        .eq("id", ctx.user.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    }),

  // API keys for MCP and programmatic access
  createApiKey: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100).default("MCP / API") }))
    .mutation(async ({ ctx, input }) => {
      const rawKey = `mf_${randomBytes(24).toString("hex")}`;
      const keyHash = hashApiKey(rawKey);
      const { data, error } = await ctx.supabase
        .from("api_keys")
        .insert({ user_id: ctx.user.id, key_hash: keyHash, name: input.name })
        .select("id, name, created_at")
        .single();
      if (error) throw new Error(error.message);
      return { ...data, key: rawKey };
    }),

  listApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.supabase
      .from("api_keys")
      .select("id, name, created_at")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }),

  revokeApiKey: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase
        .from("api_keys")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }),
});
