# MarkFlow — API Plan & Structure (Best Practices)

**Version 1.0 — February 2026**

This document defines the API surface for MarkFlow: conventions, route layout, request/response shapes, and operational practices. Aligned with Next.js App Router and tRPC where applicable.

---

## Table of Contents

1. [API Principles](#1-api-principles)
2. [Technology Choices](#2-technology-choices)
3. [Route & Module Layout](#3-route--module-layout)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Surface by Domain](#5-api-surface-by-domain)
6. [Request/Response Conventions](#6-requestresponse-conventions)
7. [Errors & Status Codes](#7-errors--status-codes)
8. [Pagination, Filtering, Sorting](#8-pagination-filtering-sorting)
9. [Rate Limiting & Security](#9-rate-limiting--security)
10. [Versioning & Evolution](#10-versioning--evolution)

---

## 1. API Principles

| Principle | Application |
|-----------|-------------|
| **Type safety** | Prefer tRPC or typed REST (OpenAPI/Zod) end-to-end so frontend and backend share contracts. |
| **REST for resources, procedures for actions** | Use REST-style URLs for CRUD on workspaces, projects, documents; use POST (or tRPC mutations) for actions like “export”, “sync”, “invite”. |
| **Idempotency** | Use `Idempotency-Key` (or equivalent) for mutations that must not run twice (e.g. GitHub sync, export). |
| **Stateless** | No server-side session store; auth via JWT/session cookie; all context in token or request. |
| **Consistent shapes** | Success: `{ data }` or direct `data`; errors: `{ error: { code, message, details? } }`. |
| **Security by default** | All routes require auth unless explicitly public; validate scope (workspace/project) on every request. |

---

## 2. Technology Choices

- **Next.js App Router:** API handlers in `app/api/.../route.ts` (or tRPC mounted at `app/api/trpc/[trpc]/route.ts`).
- **tRPC:** Recommended for app-to-app calls (dashboard, editor) for end-to-end types and one client.
- **REST:** Use for webhooks (GitHub), export download, or third-party integrations; keep URL and method semantics clear.
- **Validation:** Zod for request body and query; reuse schemas in tRPC procedures and REST handlers.
- **Auth:** Supabase Auth (session/JWT); validate on each request and resolve workspace/project membership for authorization.

---

## 3. Route & Module Layout

Suggested structure (mix of REST and tRPC):

```
app/
  api/
    trpc/
      [trpc]/
        route.ts              # tRPC handler
    auth/
      callback/
        route.ts               # OAuth callback
    webhooks/
      github/
        route.ts               # GitHub webhook (signature verification)
    v1/                         # Optional versioned REST
      workspaces/
        route.ts                # GET list, POST create
        [workspaceId]/
          route.ts              # GET, PATCH, DELETE
          projects/
            route.ts
            [projectId]/
              route.ts
              documents/
                route.ts
                [documentId]/
                  route.ts
      export/
        route.ts                # POST → trigger, GET → download (or signed URL)
      sync/
        route.ts                # POST trigger GitHub sync
src/
  server/
    trpc/
      router.ts                 # Root router
      context.ts                 # Auth + DB context
      routers/
        workspace.ts
        project.ts
        document.ts
        user.ts
    api/                         # Shared validation schemas
      schemas/
        workspace.ts
        project.ts
        document.ts
```

**Best practices**

- Co-locate route handlers with the route segment; keep business logic in `server/` or `lib/` so it can be unit-tested.
- Use a single tRPC root router that merges domain routers; expose one endpoint (e.g. `POST /api/trpc` or `GET/POST` for batch).
- For REST, prefer `api/v1/` prefix so you can introduce v2 later without breaking existing clients.

---

## 4. Authentication & Authorization

### 4.1 Extracting the user

- **Supabase:** Read session from cookie or `Authorization: Bearer <access_token>`; validate and get `user.id`.
- **tRPC context:** In `createContext`, attach `user` (or `null`) and optionally `db`/Supabase client scoped to that user so RLS applies.

### 4.2 Enforcing auth

- **tRPC:** Use a protected procedure (e.g. `protectedProcedure = baseProcedure.use(requireAuth)`); use it for all workspace/project/document procedures.
- **REST:** In each `route.ts`, check session first; return `401` if missing.

### 4.3 Authorization (scope)

- Resolve workspace (and optionally project) from path or body.
- Check membership/role via `workspace_members` (and owner) or a small helper that returns role.
- Map role to actions:
  - **viewer:** read only
  - **editor:** read + create/update/delete in projects/documents
  - **admin:** + manage projects and members
  - **owner:** full control including delete workspace and billing

Return `403` when the user is authenticated but not allowed to perform the action.

---

## 5. API Surface by Domain

### 5.1 User & profile

| Method / Procedure | Purpose | Scope |
|--------------------|---------|--------|
| `user.me` | Current user + profile | Authenticated |
| `user.updateProfile` | Update display name, avatar, editor preference | Own profile |

### 5.2 Workspaces

| Method / Procedure | Purpose | Scope |
|--------------------|---------|--------|
| `GET /api/v1/workspaces` or `workspace.list` | List workspaces for current user | Member |
| `POST /api/v1/workspaces` or `workspace.create` | Create workspace | Authenticated |
| `GET /api/v1/workspaces/:id` or `workspace.getById` | Get one workspace | Member |
| `PATCH /api/v1/workspaces/:id` or `workspace.update` | Update name, slug, logo | Owner/Admin |
| `DELETE /api/v1/workspaces/:id` or `workspace.delete` | Delete workspace | Owner |
| `workspace.listMembers` | List members and roles | Member |
| `workspace.inviteMember` | Invite by email (or link) | Owner/Admin |
| `workspace.updateMemberRole` | Change member role | Owner/Admin |
| `workspace.removeMember` | Remove member | Owner/Admin or self |

### 5.3 Projects

| Method / Procedure | Purpose | Scope |
|--------------------|---------|--------|
| `project.list` (workspaceId) | List projects in workspace | Member |
| `project.create` | Create project | Editor+ |
| `project.getById` | Get project + optional doc tree | Member |
| `project.update` | Update name, description, GitHub settings | Editor+ |
| `project.delete` | Delete project and documents | Admin+ |
| `project.connectGitHub` | OAuth flow or store repo/branch | Editor+ |
| `project.disconnectGitHub` | Clear repo link | Editor+ |

### 5.4 Documents

| Method / Procedure | Purpose | Scope |
|--------------------|---------|--------|
| `document.list` (projectId, parentId?) | List docs (and folders) under project or parent | Member |
| `document.create` | Create file or folder (template optional) | Editor+ |
| `document.getById` | Get metadata + content_yjs or content_md (for preview) | Member |
| `document.update` | Update name, path, parent (move) | Editor+ |
| `document.updateContent` | Persist Yjs state + optional Markdown | Editor+ |
| `document.delete` | Delete document (and children if folder) | Editor+ |
| `document.getByPath` | Get by projectId + path (for GitHub sync and open-by-path) | Member |

**Real-time:** Document content is edited over WebSocket (PartyKit/Hocuspocus); API is used for load/save and metadata. Optionally expose “get document” for initial load and “save document” for persistence and search index update.

### 5.5 Export & AI bundle

| Method | Purpose | Scope |
|--------|---------|--------|
| `POST /api/v1/export` | Create export job (project or workspace); return job id or signed URL | Member |
| `GET /api/v1/export/:jobId` or signed URL | Download ZIP (manifest + Markdown files) | Member / signed |

Use Idempotency-Key if you want to avoid duplicate exports for the same request.

### 5.6 GitHub sync

| Method | Purpose | Scope |
|--------|---------|--------|
| `POST /api/v1/sync` (projectId) | Trigger sync (pull from GitHub, then optionally push) | Editor+ |
| `POST /api/webhooks/github` | Receive push/pull events; verify signature; enqueue Inngest job | Webhook secret |

Sync logic (Inngest): load changed files from GitHub, merge into Yjs or replace documents, update `content_md` and `github_sha`.

### 5.7 Templates

| Method / Procedure | Purpose | Scope |
|--------------------|---------|--------|
| `template.list` | List available templates (PRD, meeting notes, etc.) | Authenticated |
| `template.getContent` (slug) | Get initial Markdown (or Yjs) for template | Authenticated |

Templates can be static files or DB rows; no need for full CRUD in MVP.

---

## 6. Request/Response Conventions

### 6.1 Success

- **tRPC:** Return plain data (e.g. `workspace`, `document`); tRPC handles envelope.
- **REST:** Either `{ data: T }` or direct `T`; be consistent. Prefer `{ data }` for lists and single resources so you can add `meta` (pagination) later.

Example:

```json
{
  "data": {
    "id": "uuid",
    "name": "My Workspace",
    "slug": "my-workspace"
  }
}
```

### 6.2 Lists

- Always return arrays as `{ data: T[], meta?: { total, cursor?, page? } }` so pagination and total count are explicit when needed.

### 6.3 Request bodies

- Validate with Zod (or equivalent); return `400` with a list of field errors when validation fails.
- Use consistent names: `snake_case` or `camelCase` (match frontend; often camelCase in JSON and map to DB snake_case in server).

---

## 7. Errors & Status Codes

| Code | Usage |
|------|--------|
| `200` | Success (GET, PATCH, or mutation that returns body). |
| `201` | Created (POST that creates a resource). |
| `204` | No content (e.g. successful DELETE). |
| `400` | Bad request (validation, bad parameters). |
| `401` | Unauthenticated (missing or invalid token). |
| `403` | Forbidden (insufficient role/scope). |
| `404` | Resource not found (or no access to avoid leaking existence). |
| `409` | Conflict (e.g. slug already exists, version conflict). |
| `429` | Too many requests (rate limit). |
| `500` | Server error (log, do not expose internals). |

**Error body shape (REST):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "path": ["name"], "message": "Required" }
    ]
  }
}
```

**tRPC:** Use `TRPCError` with `code` (`BAD_REQUEST`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_SERVER_ERROR`) and optional `cause`; client gets structured error.

**Best practice:** For 404 on resources that are behind auth, return 404 when the user has no access (do not distinguish “not found” vs “no permission” if that would leak existence).

---

## 8. Pagination, Filtering, Sorting

### 8.1 Cursor-based (recommended for feeds and large lists)

- **Query:** `cursor` (opaque string, e.g. base64 of `(updated_at, id)`), `limit` (default 20, max 100).
- **Response:** `data`, `meta.nextCursor`, `meta.hasMore` (or omit nextCursor when no more).

### 8.2 Offset (simple admin or small lists)

- **Query:** `page`, `pageSize`.
- **Response:** `data`, `meta.total`, `meta.page`, `meta.pageSize`.

### 8.3 Filtering and sorting

- **Documents:** e.g. `type=file|folder`, `parentId`, `search` (full-text on `content_md` when available).
- **Sort:** `sortBy=updatedAt`, `sortOrder=asc|desc`; default `updatedAt desc` for “recent”.
- Validate and sanitize all inputs; use allowlists for `sortBy` to avoid injection.

---

## 9. Rate Limiting & Security

- **Per user:** Limit requests per minute per `user.id` (e.g. 100/min for API, 10/min for export).
- **Per IP:** For login and webhook endpoints to reduce abuse.
- **Implementation:** Vercel KV, Upstash Redis, or Vercel’s rate limit headers; apply in middleware or inside route.
- **Security:**  
  - Validate `Content-Type` for POST/PATCH.  
  - Do not expose stack traces or DB errors to client.  
  - Verify GitHub webhook signature.  
  - Use CORS allowlist for browser clients.  
  - Prefer `SameSite` cookies for session.

---

## 10. Versioning & Evolution

- **URL versioning:** Use `/api/v1/` for REST so you can add `v2` without breaking clients.
- **tRPC:** No URL version; add new procedures or new optional fields; deprecate old procedures with a grace period and clear errors.
- **Breaking changes:** New required fields = new procedure or v2; avoid removing fields; document deprecations in changelog and error messages.

---

*Keep this document in sync with actual route and tRPC procedure names and with the DB structure doc for scope and permissions.*
