CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  content_yjs BYTEA,
  content_md TEXT,
  version_number INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(document_id, version_number)
);
