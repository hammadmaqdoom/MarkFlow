-- profiles
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- workspaces
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE UNIQUE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- workspace_members
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE UNIQUE INDEX idx_workspace_members_workspace_user ON public.workspace_members(workspace_id, user_id);

-- projects
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE UNIQUE INDEX idx_projects_workspace_slug ON public.projects(workspace_id, slug);

-- documents
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_parent ON public.documents(parent_id);
CREATE UNIQUE INDEX idx_documents_project_path ON public.documents(project_id, path);
CREATE INDEX idx_documents_updated ON public.documents(project_id, updated_at DESC);

-- optional: full-text search on documents.content_md
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_md, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_documents_content_tsv ON public.documents USING GIN(content_tsv);
