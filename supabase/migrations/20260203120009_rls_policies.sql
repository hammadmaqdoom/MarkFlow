-- profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- workspaces
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (public.user_can_access_workspace(id, auth.uid()));

CREATE POLICY "Authenticated users can create workspace"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner or admin can update workspace"
  ON public.workspaces FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    public.user_workspace_role(id, auth.uid()) = 'admin'
  );

CREATE POLICY "Only owner can delete workspace"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- workspace_members
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (public.user_can_access_workspace(workspace_id, auth.uid()));

CREATE POLICY "Owner or admin can manage members"
  ON public.workspace_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_members.workspace_id AND w.owner_id = auth.uid())
    OR public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );

-- projects: workspace_members table doesn't include owner by default, so we need to allow owner via workspaces.owner_id
CREATE POLICY "Workspace members can view projects"
  ON public.projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = projects.workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Editor+ can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Editor+ can update projects"
  ON public.projects FOR UPDATE
  USING (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

CREATE POLICY "Admin+ can delete projects"
  ON public.projects FOR DELETE
  USING (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
    OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid())
  );

-- documents
CREATE POLICY "Workspace members can view documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id
      LEFT JOIN public.workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = auth.uid()
      WHERE p.id = documents.project_id
      AND (w.owner_id = auth.uid() OR wm.user_id = auth.uid())
    )
  );

CREATE POLICY "Editor+ can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id
      AND (public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid()))
    )
  );

CREATE POLICY "Editor+ can update documents"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id
      AND (public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid()))
    )
  );

CREATE POLICY "Editor+ can delete documents"
  ON public.documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id
      AND (public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid()))
    )
  );
