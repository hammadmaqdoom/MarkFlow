CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content_yjs BYTEA,
  content_md TEXT,
  github_path TEXT,
  github_sha TEXT,
  template_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT folder_no_content CHECK (
    (type = 'folder' AND content_yjs IS NULL AND content_md IS NULL) OR
    (type = 'file')
  ),
  UNIQUE(project_id, path)
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
