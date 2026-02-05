# MarkFlow — Database Structure & Best Practices

**Version 1.0 — February 2026**

This document defines the database schema, conventions, and operational practices for MarkFlow (Supabase/PostgreSQL).

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Schema Overview](#2-schema-overview)
3. [Core Tables](#3-core-tables)
4. [Junction & Supporting Tables](#4-junction--supporting-tables)
5. [Indexes](#5-indexes)
6. [Row Level Security (RLS)](#6-row-level-security-rls)
7. [Constraints & Validation](#7-constraints--validation)
8. [Migrations & Versioning](#8-migrations--versioning)
9. [Backup, Recovery & Observability](#9-backup-recovery--observability)

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Single source of truth** | `auth.users` for identity; one `profiles` row per user. Document content: Yjs binary as source, Markdown as derived/search. |
| **Explicit ownership** | Every workspace has `owner_id`; every resource is reachable via workspace → project → document hierarchy. |
| **Soft boundaries** | Use `parent_id` for trees (folders/documents); avoid deep polymorphic relations. |
| **Idempotent identifiers** | Use `UUID` primary keys (`gen_random_uuid()`) for all entities to avoid collisions in distributed/offline scenarios. |
| **Audit trail** | `created_at` and `updated_at` on all mutable tables; optional `updated_by` where needed for accountability. |
| **Security by default** | RLS on every table; no table is globally readable/writable by default. |

---

## 2. Schema Overview

```
auth.users (Supabase managed)
       │
       ▼
  profiles ──────────────────────────────────────────────────
       │                                                       │
       │ owner_id                                              │ member
       ▼                                                       ▼
  workspaces ◄──────────────────────────── workspace_members
       │
       │ workspace_id        workspace_id
       ├──────────────────► teams ◄────── team_members (user_id → profiles)
       │
       │ workspace_id
       ▼
  projects ◄──────────────────────────── project_workspace_grants (grants project to another workspace: view | edit)
       │
       │ project_id
       ▼
  documents (self-referential parent_id for folders)
       │
       │ document_id (optional)
       ▼
  document_versions (optional, for history/backup)
```

**Naming conventions**

- **Tables:** `snake_case`, plural (`workspaces`, `documents`).
- **Columns:** `snake_case`; foreign keys: `{table_singular}_id` (e.g. `workspace_id`, `owner_id`).
- **Primary keys:** `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
- **Timestamps:** `created_at`, `updated_at` — `TIMESTAMPTZ DEFAULT NOW()`; use triggers for `updated_at`.

---

## 3. Core Tables

### 3.1 `profiles`

Extends Supabase `auth.users`. One row per user.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT, -- denormalized from auth for display/search
  github_username TEXT,
  github_token_encrypted TEXT,
  editor_preference TEXT CHECK (editor_preference IN ('wysiwyg', 'markdown', 'split')) DEFAULT 'wysiwyg',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Best practices**

- Do not store plain GitHub tokens; use application-level encryption (e.g. AES-256-GCM) and store only `github_token_encrypted`.
- Keep `profiles` narrow; add optional “preferences” or “settings” JSONB only if needed, with a clear schema.

---

### 3.2 `workspaces`

Top-level container (e.g. company/team). One owner; many members via `workspace_members`.

```sql
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(slug)
);

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Slug rules**

- Unique across the table.
- Generated from `name` (lowercase, replace spaces with `-`, remove invalid chars).
- Use a DB or app-level function to enforce uniqueness (e.g. append suffix on conflict).

---

### 3.3 `projects`

Belongs to one workspace; groups documents and optional GitHub link.

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  github_repo TEXT,       -- "owner/repo"
  github_branch TEXT DEFAULT 'main',
  sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, slug)
);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Best practices**

- `UNIQUE(workspace_id, slug)` keeps project URLs stable per workspace.
- `ON DELETE CASCADE` from workspace so deleting a workspace removes its projects (and downstream documents, if desired).

---

### 3.4 `documents`

Files and folders in a project. Tree structure via `parent_id`.

```sql
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
  )
);

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

**Field usage**

- **path:** Full path from project root (e.g. `docs/README.md`, `meetings/2026-02.md`). Enables path-based lookups and uniqueness per project.
- **content_yjs:** Yjs document state (binary). Source of truth for editor.
- **content_md:** Plain Markdown derived from Yjs for full-text search and export; updated on save.
- **github_path / github_sha:** For GitHub sync; `github_path` is repo-relative path.
- **template_slug:** If created from a template (e.g. `prd`, `meeting-notes`).

**Best practices**

- Enforce `UNIQUE(project_id, path)` so path is unique within a project.
- Keep Yjs blobs; avoid storing large Markdown in the same row if you add a separate search index (e.g. tsvector). Prefer one row per document for simplicity in MVP.

---

## 4. Junction & Supporting Tables

### 4.1 `workspace_members`

Many-to-many: users ↔ workspaces with role.

```sql
CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'editor',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
```

**Best practices**

- One row per (workspace, user). Owner can be represented by `role = 'owner'` and optionally by `workspaces.owner_id` for quick lookups.
- Do not duplicate owner in `workspace_members` unless you want a single table for “all members”; if duplicated, keep in sync with `workspaces.owner_id` via trigger or app logic.

---

### 4.2 `teams`

Subgroups within a workspace; each team has its own members (who must be workspace members).

```sql
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(workspace_id, slug)
);
```

**RLS:** Workspace members can SELECT; workspace owner/admin can INSERT/UPDATE/DELETE.

---

### 4.3 `team_members`

Many-to-many: users ↔ teams with role (lead | member). Users must already be workspace members (enforced in app).

```sql
CREATE TYPE public.team_role AS ENUM ('lead', 'member');

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(team_id, user_id)
);
```

**RLS:** Workspace members can SELECT; workspace owner/admin or team lead can INSERT/UPDATE/DELETE.

---

### 4.4 `project_workspace_grants`

Cross-workspace sharing: grant a project to another workspace with view or edit role. Document access is derived from project (granted workspace members see project and documents; edit grant allows write).

```sql
CREATE TABLE public.project_workspace_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('view', 'edit')),
  granted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(project_id, workspace_id)
);
```

**Rules:** No self-grant (project’s workspace ≠ granted workspace); enforced by trigger or app. **RLS:** INSERT by project owner/admin/editor; SELECT by project members and by granted workspace members; DELETE by project owner/admin or granter. **projects / documents:** Additional RLS policies allow SELECT (and write for documents when grant role is edit) for users whose workspace has a grant on the project. **document_comments:** Granted workspace members (view grant: read; edit grant: read + add) can view/add comments.

---

### 4.5 `document_versions` (optional, for history/backup)

Snapshot or incremental history for documents. MVP can omit; add when implementing “version history”.

```sql
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
```

---

## 5. Indexes

Create indexes to match access patterns and RLS subqueries.

```sql
-- profiles (usually looked up by id; username for @mention search)
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- workspaces
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);
CREATE UNIQUE INDEX idx_workspaces_slug ON public.workspaces(slug);

-- workspace_members (RLS and “my workspaces” queries)
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE UNIQUE INDEX idx_workspace_members_workspace_user ON public.workspace_members(workspace_id, user_id);

-- projects
CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
CREATE UNIQUE INDEX idx_projects_workspace_slug ON public.projects(workspace_id, slug);

-- documents (tree and path lookups)
CREATE INDEX idx_documents_project ON public.documents(project_id);
CREATE INDEX idx_documents_parent ON public.documents(parent_id);
CREATE UNIQUE INDEX idx_documents_project_path ON public.documents(project_id, path);
CREATE INDEX idx_documents_updated ON public.documents(project_id, updated_at DESC);
```

**Full-text search (optional for MVP)**

```sql
ALTER TABLE public.documents
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content_md, ''))) STORED;

CREATE INDEX idx_documents_content_tsv ON public.documents USING GIN(content_tsv);
```

---

## 6. Row Level Security (RLS)

Enable RLS on all application tables. Service role bypasses RLS; application uses authenticated user.

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
```

### 6.1 Helper: “user is member of workspace”

```sql
CREATE OR REPLACE FUNCTION public.user_workspace_role(ws_id UUID, u_id UUID)
RETURNS public.workspace_role AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = ws_id AND user_id = u_id
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

Optional: also treat `workspaces.owner_id = u_id` as owner if owner is not in `workspace_members`.

### 6.2 Policies

**profiles**

- Users can read/update their own profile only.

```sql
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());
```

**workspaces**

- Members can read; only owner (or admin, depending on product) can update/delete.

```sql
CREATE POLICY "Members can view workspace"
  ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspaces.id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner or admin can update workspace"
  ON public.workspaces FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    public.user_workspace_role(id, auth.uid()) = 'admin'
  );

CREATE POLICY "Only owner can delete workspace"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());
```

**workspace_members**

- Members can list; only owner/admin can insert/update/delete.

```sql
CREATE POLICY "Members can view workspace members"
  ON public.workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_members.workspace_id
      AND (w.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.workspace_members wm2
        WHERE wm2.workspace_id = w.id AND wm2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Owner or admin can manage members"
  ON public.workspace_members FOR ALL
  USING (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );
```

**projects**

- Visible to workspace members; editable by editor+.

```sql
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
  );

CREATE POLICY "Editor+ can update projects"
  ON public.projects FOR UPDATE
  USING (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
  );

CREATE POLICY "Admin+ can delete projects"
  ON public.projects FOR DELETE
  USING (
    public.user_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin')
  );
```

**documents**

- Same idea: read if member of workspace; write if editor+.

```sql
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
      AND public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editor+ can update documents"
  ON public.documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id
      AND public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
    )
  );

CREATE POLICY "Editor+ can delete documents"
  ON public.documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = documents.project_id
      AND public.user_workspace_role(p.workspace_id, auth.uid()) IN ('owner', 'admin', 'editor')
    )
  );
```

---

## 7. Constraints & Validation

- **Referential integrity:** Use `ON DELETE CASCADE` for child entities (e.g. documents when project is deleted); `RESTRICT` or `SET NULL` where you must prevent or soften deletes.
- **Check constraints:** Already used for `documents.type` and folder vs file content; add checks for `path` format (e.g. no leading/trailing slashes, no `..`) in app or DB.
- **Slug format:** Enforce in app (lowercase, alphanumeric + hyphen); optionally DB check with regex.
- **Enum for roles:** `workspace_role` enum keeps role values consistent and index-friendly.

---

## 8. Migrations & Versioning

- **Tool:** Use Supabase migrations (e.g. `supabase/migrations/`) with sequential filenames: `YYYYMMDDHHMMSS_description.sql`.
- **Idempotency:** Prefer `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, and conditional creation of indexes/functions so re-runs are safe.
- **Zero-downtime:** For large tables, add new columns as nullable first, backfill, then add NOT NULL/default; drop columns in a later migration after code has stopped using them.
- **Secrets:** Never commit encryption keys or tokens; use Supabase secrets or env for key material.

---

## 9. Backup, Recovery & Observability

- **Backups:** Rely on Supabase automated backups; define retention and point-in-time recovery (PITR) per plan.
- **Critical data:** Document which tables contain PII or tokens; ensure encryption at rest and in backups.
- **Observability:** Use Supabase logs and (if needed) pg_stat_statements for slow queries; align indexes with actual query patterns.
- **Health checks:** Ensure auth and one read path (e.g. list workspaces) are covered by app health checks that run against the DB.

---

*This document should be updated whenever the schema or RLS model changes. Keep migration files and this doc in sync.*
