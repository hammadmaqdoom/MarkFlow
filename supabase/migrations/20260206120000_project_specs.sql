-- project_specs: one row per project, stores concept input and optional department overrides for AI doc generation
CREATE TABLE public.project_specs (
  project_id UUID PRIMARY KEY REFERENCES public.projects(id) ON DELETE CASCADE,
  concept_input JSONB NOT NULL DEFAULT '{}',
  department_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER project_specs_updated_at
  BEFORE UPDATE ON public.project_specs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.project_specs ENABLE ROW LEVEL SECURITY;

-- RLS: same visibility as projects (via project_id -> projects -> workspace)
CREATE POLICY "Workspace members can view project_specs"
  ON public.project_specs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = auth.uid()
      WHERE p.id = project_specs.project_id
    )
    OR EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.workspaces w ON w.id = p.workspace_id AND w.owner_id = auth.uid()
      WHERE p.id = project_specs.project_id
    )
  );

CREATE POLICY "Editor+ can insert project_specs"
  ON public.project_specs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_specs.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Editor+ can update project_specs"
  ON public.project_specs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_specs.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );

CREATE POLICY "Editor+ can delete project_specs"
  ON public.project_specs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_specs.project_id
      AND (
        public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
        OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = p.workspace_id AND w.owner_id = auth.uid())
      )
    )
  );
