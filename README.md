# MarkFlow

The Founder's Growth Engine — real-time collaborative documentation with dual-mode (WYSIWYG + Markdown) editing.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set your Supabase (and optional PartyKit, GitHub) variables.

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

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start Next.js dev server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint
- `npm run format` — run Prettier

## Docs

- [Database structure](docs/01-db-structure.md)
- [API plan](docs/02-api-plan-structure.md)
- [Frontend UI implementation](docs/03-frontend-ui-implementation.md)
- [PRD & architecture](markflow-prd-architecture.md)
