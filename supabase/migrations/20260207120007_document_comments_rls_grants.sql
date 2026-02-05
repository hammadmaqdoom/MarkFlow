-- Document comments: allow granted workspace members to view (any grant) and add (edit grant only)
CREATE POLICY "Granted workspace members can view document comments"
  ON public.document_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      JOIN public.project_workspace_grants g ON g.project_id = p.id
      WHERE d.id = document_comments.document_id
      AND (
        EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Granted workspace editors can insert document comments"
  ON public.document_comments FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.projects p ON p.id = d.project_id
      JOIN public.project_workspace_grants g ON g.project_id = p.id AND g.role = 'edit'
      WHERE d.id = document_comments.document_id
      AND (
        EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );
