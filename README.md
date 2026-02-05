# MarkFlow

The Founder's Growth Engine — real-time collaborative documentation with dual-mode (WYSIWYG + Markdown) editing.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` (or `.env.local`) and set:

   - **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (for API/server).
   - **PartyKit (real-time):** `NEXT_PUBLIC_PARTYKIT_URL` (e.g. `http://localhost:1999` in dev). Run PartyKit with `npm run partykit:dev` alongside the app.
   - **GitHub (optional):** for OAuth and sync, set the keys referenced in `.env.example`.

3. **Database migrations (Supabase)**

   Migrations live in `supabase/migrations/` with timestamped names (`YYYYMMDDHHMMSS_description.sql`).

   **Option A: Supabase CLI (recommended)**

   - Install [Supabase CLI](https://supabase.com/docs/guides/cli).
   - Link your project: `supabase link --project-ref YOUR_REF`.
   - Run migrations: `supabase db push`.

   **Option B: Supabase Dashboard**

   - In the SQL Editor, run each file in `supabase/migrations/` in order (oldest timestamp first).

   **Order:** Run migrations in filename order so that tables, indexes, RLS, and the profile trigger are applied correctly.

4. **Run the app**

   **Development (Next.js + PartyKit for real-time editing):**

   ```bash
   npm run dev          # Next.js on http://localhost:3000
   npm run partykit:dev # PartyKit (separate terminal)
   ```

   Open [http://localhost:3000](http://localhost:3000). For full editor sync, both dev servers should be running.

   **Production build:**

   ```bash
   npm run build
   npm run start
   ```

## MCP (Model Context Protocol)

Markflow exposes an MCP server so AI assistants (Claude Desktop, Cursor, etc.) can read and write your documents.

1. **Create an API key**  
   In the app: open the user menu (avatar) → **API keys** → **Create API key**. Copy the key (it starts with `mf_` and is shown only once).

2. **Use the remote MCP endpoint** (recommended when the app is on Vercel)  
   Your deployed app serves MCP over HTTP at:

   **`https://your-app.vercel.app/api/mcp`**

   Configure your AI client to use this URL with your API key as a Bearer token. Example for Claude Desktop (`claude_desktop_config.json`) with **HTTP** transport:

   ```json
   {
     "mcpServers": {
       "markflow": {
         "url": "https://your-app.vercel.app/api/mcp",
         "headers": {
           "Authorization": "Bearer mf_your_key_here"
         }
       }
     }
   }
   ```

   No local process or repo clone needed — the MCP server runs on Vercel.

3. **Optional: local stdio server**  
   If you prefer a local MCP process (e.g. for development), run:

   ```bash
   DOCMGMT_URL=https://your-app.com DOCMGMT_API_KEY=mf_xxx npm run mcp
   ```

   Then point your AI client at this process with **stdio** transport (command `npx`, args `["tsx", "scripts/mcp-server.ts"]`, `cwd` = repo root, same env vars).

**Tools exposed:** `list_workspaces`, `list_projects`, `list_documents`, `read_document`, `read_document_by_path`, `write_document`, `create_document`.

Run the **database migration** that adds the `api_keys` table before creating API keys: apply `supabase/migrations/20260205120000_api_keys.sql`.

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run partykit:dev` — start PartyKit dev server (real-time doc sync)
- `npm run mcp` — run MCP server (stdio; set `DOCMGMT_URL` and `DOCMGMT_API_KEY`)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `npm run test` — run unit tests (Vitest)
- `npm run test:e2e` — run E2E tests (Playwright; requires app running)

## Docs

- [Database structure](docs/01-db-structure.md)
- [API plan](docs/02-api-plan-structure.md)
- [Frontend UI implementation](docs/03-frontend-ui-implementation.md)
- [PRD & architecture](docs/markflow-prd-architecture.md)
