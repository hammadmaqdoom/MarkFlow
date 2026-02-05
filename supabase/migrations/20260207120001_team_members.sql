-- Team role: lead or member (only workspace members can be added; enforced in app)
CREATE TYPE public.team_role AS ENUM ('lead', 'member');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON public.team_members(team_id);
CREATE INDEX idx_team_members_user ON public.team_members(user_id);
