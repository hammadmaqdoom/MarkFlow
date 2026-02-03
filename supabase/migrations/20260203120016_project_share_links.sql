CREATE TABLE public.project_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'password')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_project_share_links_token ON public.project_share_links(token);
CREATE INDEX idx_project_share_links_project ON public.project_share_links(project_id);

ALTER TABLE public.project_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editor+ can manage project share links"
  ON public.project_share_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_share_links.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_share_links.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );
