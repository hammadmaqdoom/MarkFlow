CREATE TABLE public.share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'password')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_share_links_document ON public.share_links(document_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editor+ can manage share links for their workspace docs"
  ON public.share_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = share_links.document_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = share_links.document_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );
