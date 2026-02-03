-- Invite links: token = UUID, workspace_id, role, expires_at, created_by
CREATE TABLE public.workspace_invites (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  expires_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_workspace_invites_workspace_id ON public.workspace_invites(workspace_id);
CREATE INDEX idx_workspace_invites_expires_at ON public.workspace_invites(expires_at);

ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Only workspace owner/admin can create invites; no read (token is secret)
CREATE POLICY workspace_invites_insert ON public.workspace_invites
  FOR INSERT WITH CHECK (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- Service role or no policy for SELECT by token (used in accept flow with token)
-- Accept flow will use a server route that looks up by token and adds member
