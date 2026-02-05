-- Helper: does the current user's workspace have a grant on this project? (for RLS)
CREATE OR REPLACE FUNCTION public.user_workspace_has_project_grant(proj_id UUID, grant_role TEXT DEFAULT NULL)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_workspace_grants g
    WHERE g.project_id = proj_id
    AND (grant_role IS NULL OR g.role = grant_role)
    AND (
      EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = auth.uid())
    )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Projects: allow SELECT when user's workspace has a grant on this project
CREATE POLICY "Granted workspace members can view projects"
  ON public.projects FOR SELECT
  USING (public.user_workspace_has_project_grant(id, NULL));

-- Documents: allow SELECT when user's workspace has a grant on the project
CREATE POLICY "Granted workspace members can view documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_workspace_grants g ON g.project_id = p.id
      WHERE p.id = documents.project_id
      AND (
        EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = g.workspace_id AND wm.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = g.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

-- Documents: allow INSERT/UPDATE/DELETE when user's workspace has edit grant on the project
CREATE POLICY "Granted workspace editors can insert documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.user_workspace_has_project_grant(project_id, 'edit'));

CREATE POLICY "Granted workspace editors can update documents"
  ON public.documents FOR UPDATE
  USING (public.user_workspace_has_project_grant(project_id, 'edit'));

CREATE POLICY "Granted workspace editors can delete documents"
  ON public.documents FOR DELETE
  USING (public.user_workspace_has_project_grant(project_id, 'edit'));
