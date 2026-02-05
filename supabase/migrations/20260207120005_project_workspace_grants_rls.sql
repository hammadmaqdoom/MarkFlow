ALTER TABLE public.project_workspace_grants ENABLE ROW LEVEL SECURITY;

-- Project owner/admin/editor can create grants
CREATE POLICY "Project owner admin editor can create grants"
  ON public.project_workspace_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_workspace_grants.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

-- Project members can list grants; granted workspace members can see rows that grant their workspace
CREATE POLICY "Project or granted workspace members can view grants"
  ON public.project_workspace_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_workspace_grants.project_id
      AND (
        public.user_can_access_workspace(p.workspace_id, auth.uid())
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = project_workspace_grants.workspace_id AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = project_workspace_grants.workspace_id AND w.owner_id = auth.uid()
    )
  );

-- Project owner/admin or original granter can delete (revoke)
CREATE POLICY "Project owner admin or granter can delete grants"
  ON public.project_workspace_grants FOR DELETE
  USING (
    granted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_workspace_grants.project_id
      AND (
        EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
        OR public.user_workspace_role(p.workspace_id, auth.uid()) = 'admin'
      )
    )
  );
