ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view document versions"
  ON public.document_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = document_versions.document_id
      AND (
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
        )
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );
