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

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run partykit:dev` — start PartyKit dev server (real-time doc sync)
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
