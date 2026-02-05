ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can view team members
CREATE POLICY "Workspace members can view team members"
  ON public.team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND public.user_can_access_workspace(t.workspace_id, auth.uid())
    )
  );

-- Workspace owner, admin, or team lead can manage team members
CREATE POLICY "Owner admin or team lead can manage team members"
  ON public.team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND (
        EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = t.workspace_id AND w.owner_id = auth.uid())
        OR public.user_workspace_role(t.workspace_id, auth.uid()) = 'admin'
        OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid() AND tm.role = 'lead')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
      AND (
        EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = t.workspace_id AND w.owner_id = auth.uid())
        OR public.user_workspace_role(t.workspace_id, auth.uid()) = 'admin'
        OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = t.id AND tm.user_id = auth.uid() AND tm.role = 'lead')
      )
    )
  );
