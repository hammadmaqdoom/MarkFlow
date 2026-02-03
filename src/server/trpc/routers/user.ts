import { z } from "zod";
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
});
