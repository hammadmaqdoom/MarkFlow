-- Rename department_overrides to domain_overrides in project_specs (only if old column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'project_specs' AND column_name = 'department_overrides'
  ) THEN
    ALTER TABLE public.project_specs RENAME COLUMN department_overrides TO domain_overrides;
  END IF;
END $$;
