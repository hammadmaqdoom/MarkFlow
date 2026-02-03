CREATE TABLE public.document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
  anchor JSONB NOT NULL,
  content_text TEXT NOT NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_document_comments_document ON public.document_comments(document_id);
CREATE INDEX idx_document_comments_parent ON public.document_comments(parent_id);

ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view document comments"
  ON public.document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = document_comments.document_id
      AND (
        EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Editor+ can insert document comments"
  ON public.document_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = document_comments.document_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Author or admin can update document comments"
  ON public.document_comments FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = document_comments.document_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Author or admin can delete document comments"
  ON public.document_comments FOR DELETE
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = document_comments.document_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE TRIGGER document_comments_updated_at
  BEFORE UPDATE ON public.document_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
