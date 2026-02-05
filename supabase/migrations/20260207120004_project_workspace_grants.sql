-- Cross-workspace sharing: grant a project to another workspace (view or edit)
CREATE TABLE public.project_workspace_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('view', 'edit')),
  granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, workspace_id)
);

-- Prevent self-grant: project's workspace must differ from granted workspace
CREATE OR REPLACE FUNCTION public.project_workspace_grants_no_self_grant()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = NEW.project_id AND p.workspace_id = NEW.workspace_id
  ) THEN
    RAISE EXCEPTION 'Cannot grant project to its own workspace';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_workspace_grants_no_self_grant
  BEFORE INSERT ON public.project_workspace_grants
  FOR EACH ROW EXECUTE FUNCTION public.project_workspace_grants_no_self_grant();

CREATE INDEX idx_project_workspace_grants_project ON public.project_workspace_grants(project_id);
CREATE INDEX idx_project_workspace_grants_workspace ON public.project_workspace_grants(workspace_id);
