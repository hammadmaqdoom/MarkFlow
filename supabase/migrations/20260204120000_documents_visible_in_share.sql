-- Allow hiding documents/folders from public share view
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS visible_in_share BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.documents.visible_in_share IS 'When false, document/folder is hidden from project and folder share links.';
