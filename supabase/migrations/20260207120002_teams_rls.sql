ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Workspace members can view teams
CREATE POLICY "Workspace members can view teams"
  ON public.teams FOR SELECT
  USING (public.user_can_access_workspace(workspace_id, auth.uid()));

-- Workspace owner or admin can create teams
CREATE POLICY "Owner or admin can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = auth.uid())
    OR public.user_workspace_role(workspace_id, auth.uid()) = 'admin'
  );

-- Workspace owner or admin can update teams
CREATE POLICY "Owner or admin can update teams"
  ON public.teams FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = auth.uid())
    OR public.user_workspace_role(workspace_id, auth.uid()) = 'admin'
  );

-- Workspace owner or admin can delete teams
CREATE POLICY "Owner or admin can delete teams"
  ON public.teams FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = teams.workspace_id AND w.owner_id = auth.uid())
    OR public.user_workspace_role(workspace_id, auth.uid()) = 'admin'
  );
