# MarkFlow — Frontend UI Implementation & Best Practices

**Version 1.0 — February 2026**

This document defines how to implement the MarkFlow web app: app structure, routing, components, editor integration, state management, and UI/UX practices. Aligned with Next.js 14 App Router, React, and TipTap + Yjs.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Tech Stack & Responsibilities](#2-tech-stack--responsibilities)
3. [App Structure & Routing](#3-app-structure--routing)
4. [Data Fetching & State](#4-data-fetching--state)
5. [Dual-Mode Editor Implementation](#5-dual-mode-editor-implementation)
6. [Core UI Components](#6-core-ui-components)
7. [Layouts & Navigation](#7-layouts--navigation)
8. [Accessibility & Performance](#8-accessibility--performance)
9. [Design System & Theming](#9-design-system--theming)
10. [Testing & Quality](#10-testing--quality)

---

## 1. Design Principles

| Principle | Application |
|-----------|-------------|
| **Server-first** | Use Server Components by default; Client Components only for interactivity (editor, modals, quick switcher). |
| **Progressive enhancement** | Core navigation and content load without JS; editor and real-time features require JS. |
| **One source of truth** | Document content lives in Yjs; UI state (mode, sidebar open) in React state or URL. |
| **Fast perceived performance** | Streaming, Suspense, and skeletons so users see structure immediately; lazy-load editor and heavy modules. |
| **Accessible by default** | Semantic HTML, ARIA where needed, keyboard navigation (Cmd+K, Escape), focus management in modals. |
| **Consistent UX** | Same patterns for workspace/project/document hierarchy; predictable shortcuts and actions. |

### 1.1 Visual direction: Attio / Linear style (clean & minimal)

The UI should feel like **Attio** and **Linear**: very clean, minimal, and professional. No visual clutter; hierarchy through typography and spacing, not decoration.

| Trait | Application |
|-------|-------------|
| **Restrained palette** | Neutrals (grays) dominate; one subtle accent for primary actions and focus. No bright or competing colors. |
| **Generous whitespace** | Ample padding and margins; avoid dense layouts. Let content breathe. |
| **Subtle chrome** | Thin borders (1px), very low-contrast or hairline; minimal or no shadows. Surfaces defined by border and spacing, not depth. |
| **Typography-led hierarchy** | Clear scale (e.g. 12–14px body, 16–20px headings); weight and size for emphasis, not color. Prefer a single, highly readable sans. |
| **Minimal decoration** | No gradients, patterns, or decorative elements unless strictly functional (e.g. code block background). |
| **Refined interactions** | Subtle hover/focus states (slight background or border change); no heavy animations. Keyboard-first, predictable. |
| **Single accent** | One primary/accent color (e.g. desaturated blue or brand hue) for links, primary buttons, and focus only. |

---

## 2. Tech Stack & Responsibilities

| Layer | Technology | Responsibility |
|-------|------------|----------------|
| Framework | Next.js 14 (App Router) | Routing, SSR, API routes, middleware, streaming. |
| UI | React 18 | Components, hooks, Suspense, transitions. |
| Editor | TipTap + Yjs | Rich text, Markdown serialization, WYSIWYG and Markdown views, tables, task lists. |
| Real-time | Yjs + PartyKit (or Hocuspocus) provider | CRDT sync, presence, cursors. |
| Data | tRPC or fetch + SWR/React Query | Server state; cache, dedupe, revalidate. |
| Auth | Supabase Auth | Session, login/signup UI, protected routes. |
| Styling | Tailwind CSS + CSS variables | Theming, spacing, typography, components. |

**Best practices**

- Use **Server Components** for layout, list pages, and static shell; **Client Components** only where you need `useState`, `useEffect`, event handlers, or browser APIs.
- Lazy-load the editor bundle (`React.lazy` + dynamic import) so the initial shell stays small.
- Keep editor and real-time provider in a single client subtree (e.g. `app/(app)/doc/[id]/editor.tsx`) to avoid unnecessary re-renders.

---

## 3. App Structure & Routing

### 3.1 Route segments

```
app/
  layout.tsx                    # Root: fonts, theme, providers
  page.tsx                      # Landing / marketing (public)
  (auth)/
    login/
      page.tsx
    signup/
      page.tsx
    callback/
      page.tsx                  # OAuth callback
  (app)/                        # Dashboard (protected)
    layout.tsx                  # Sidebar, workspace context, auth check
    page.tsx                    # Redirect to default workspace or onboarding
    w/
      [workspaceSlug]/
        layout.tsx              # Resolve workspace, project list
        page.tsx                # Workspace home / project list
        p/
          [projectSlug]/
            layout.tsx          # Resolve project, doc tree
            page.tsx            # Project home or default doc
            doc/
              [documentId]/
                page.tsx        # Document page: load doc, render editor client
  api/                          # See API doc
```

**Conventions**

- Use **route groups** `(auth)` and `(app)` to separate public vs authenticated layout without changing URL.
- Use **dynamic segments** `[workspaceSlug]`, `[projectSlug]`, `[documentId]` for deep-linking; resolve IDs in layout or page and pass via context or props.
- Prefer **document by ID** in URL (`/doc/uuid`) so path renames do not break links; show human-readable path in UI (breadcrumb/sidebar).

### 3.2 Layout hierarchy

- **Root layout:** Global providers (theme, auth), fonts, base meta.
- **App layout:** Sidebar, workspace switcher, user menu; wrap children in Suspense where needed.
- **Workspace layout:** Resolve workspace from slug; fetch projects; provide workspace context.
- **Project layout:** Resolve project; fetch doc tree; provide project context; optional doc list in sidebar.
- **Document page:** Load single document (metadata + content); render editor in client component.

**Best practices**

- Use `loading.tsx` at each segment for instant loading states; use `error.tsx` for error boundaries.
- Resolve workspace/project in layout with `await` and pass to children; avoid duplicate fetches in sibling pages.
- Use `not-found.tsx` when workspace/project/document is missing or user has no access (return 404, do not leak existence).

---

## 4. Data Fetching & State

### 4.1 Server-side

- **Server Components:** Fetch with `fetch` or server-side tRPC; use cache options (`next: { revalidate }` or `cache: 'force-cache'`) where appropriate.
- **Parallel fetching:** In layout or page, `await Promise.all([getWorkspace(), getProjects()])` to avoid waterfalls.
- **Streaming:** Wrap slow sections in `<Suspense fallback={...}>` so the rest of the page streams first.

### 4.2 Client-side

- **Lists and refetch:** Use **SWR** or **React Query** (or tRPC hooks) for workspace list, project list, doc tree; get initial data from Server Component when possible and hydrate cache.
- **Deduplication:** Same key = one request; avoid fetching the same document in layout and editor.
- **Optimistic updates:** For renames and moves, update cache optimistically and revert on error.
- **Prefetch:** On hover/focus of doc link, prefetch document metadata (or full doc) for instant open.

### 4.3 State boundaries

- **URL state:** Current workspace/project/doc, query params (e.g. `?mode=markdown`) for shareable state.
- **Server state:** Workspaces, projects, documents, user profile — in SWR/React Query or tRPC.
- **UI state:** Sidebar open/closed, editor mode (WYSIWYG/Markdown/split), modal open — in React state or localStorage-synced.
- **Document state:** Live content in Yjs; persist to API on save (debounced or explicit).

**Best practices**

- Do not put server data in global client state stores unless it is derived/cached from the data layer; let the data layer be the source of truth.
- Persist user preferences (editor mode, sidebar collapsed) in `localStorage` and optionally sync to profile via API.

---

## 5. Dual-Mode Editor Implementation

### 5.1 Architecture

- **Single Yjs document** per document ID; both WYSIWYG and Markdown views bind to the same Yjs doc.
- **TipTap** as the editing surface; use extensions for Markdown serialization, tables, task lists, code blocks.
- **Mode toggle:** Switch between WYSIWYG view (TipTap rich view) and Markdown view (raw Markdown derived from Yjs or TipTap); user preference stored in profile/localStorage.
- **Persistence:** On save (debounced or on blur), serialize Yjs to binary and optional Markdown; POST to API; API updates `content_yjs` and `content_md`.

### 5.2 TipTap extensions (recommended)

| Extension | Purpose |
|-----------|---------|
| `@tiptap/extension-document`, `paragraph`, `text` | Base structure |
| `@tiptap/extension-markdown` (or custom) | Markdown ↔ ProseMirror |
| `@tiptap/extension-table`, `table-row`, `table-cell`, `table-header` | Visual table editing |
| `@tiptap/extension-task-list`, `task-item` | Interactive checkboxes |
| `@tiptap/extension-code-block-lowlight` | Syntax highlighting |
| `@tiptap/extension-collaboration` | Yjs binding |
| `@tiptap/extension-collaboration-cursor` | Multi-user cursors |
| Custom | Markdown source view (read-only or editable textarea synced to same Yjs) |

### 5.3 Yjs provider

- Use **y-partykit** (or Hocuspocus) provider; connect with `documentId` (and optional auth token).
- On load: fetch initial Yjs state from API (or from provider if server persists); merge into local Yjs doc; bind TipTap to Yjs.
- On save: extract Yjs state, POST to API; optionally extract Markdown for search/export.
- **Offline:** Use `y-indexeddb` for local persistence; sync when back online.

### 5.4 Mode switching

- **WYSIWYG:** TipTap with full extensions; no raw Markdown visible.
- **Markdown:** Either (a) a separate view that shows Markdown string (from TipTap serializer or Yjs→Markdown) and writes back on edit, or (b) a “source” panel that stays in sync with Yjs. Ensure no data loss when switching (Markdown is canonical for export).
- **Split:** Optional side-by-side: Markdown left, WYSIWYG right (or vice versa); same Yjs doc.

**Best practices**

- Lazy-load TipTap and Yjs provider so the document route loads fast; show a skeleton until editor is ready.
- Use a single **EditorProvider** (or equivalent) that owns Yjs connection and TipTap instance; avoid remounting on mode switch so Yjs state is preserved.
- Debounce persist (e.g. 2–5 seconds after last edit) to reduce API load; show “Saving…” / “Saved” in UI.

---

## 6. Core UI Components

All shell, list, editor, and modal UI should follow the **Attio/Linear-style** rules in §1.1 and §9: minimal chrome, typography-led hierarchy, subtle borders, one accent.

### 6.1 Shell

- **Sidebar:** Workspace switcher, project list, doc tree (folders/files), “New doc”, “Templates”, “Recent”.
- **Top bar:** Breadcrumb (Workspace / Project / Doc), document title (editable inline or in modal), user avatar + menu, share (later), export.
- **Quick switcher (Cmd+K):** Modal with search; list workspaces, projects, recent docs, and optionally full-text doc search; keyboard navigation (arrows, Enter to open).

### 6.2 Document list & tree

- **Tree:** Nested folders and files; expand/collapse; drag-and-drop to move (optional for MVP).
- **Context menu:** New file, New folder, Rename, Move, Delete.
- **Selection:** Single doc for open; optional multi-select for bulk move/delete later.

### 6.3 Editor chrome

- **Toolbar:** Bold, italic, headings, lists, checklist, table, link, image, code block; slash command (“/”) for block insertion.
- **Mode toggle:** WYSIWYG | Markdown | Split (icons or tabs).
- **Presence:** Avatars or dots for users currently viewing/editing; show names on hover.
- **Save indicator:** “Saving…” / “Saved” / “Unsaved changes”.

### 6.4 Modals & overlays

- **New doc:** Template picker or blank; name and parent folder.
- **New project / workspace:** Name, slug (auto from name), optional GitHub repo.
- **Settings:** Workspace/project settings; GitHub connection; member list and invites.
- **Invite:** Email or link; role selector.

**Best practices**

- Use a single **modal/dialog** component with focus trap and Escape to close; announce to screen readers (aria-modal, role="dialog").
- Prefer **composition** (e.g. `<Modal><NewDocForm /></Modal>`) over many specific modal components.

---

## 7. Layouts & Navigation

### 7.1 Responsive behavior

- **Desktop:** Sidebar always visible (or collapsible); editor uses remaining width.
- **Tablet/mobile:** Sidebar as overlay/drawer; open via menu icon or swipe; close after navigation.
- **Editor:** Full width on small screens; toolbar can wrap or collapse into overflow menu.

### 7.2 Navigation patterns

- **Breadcrumb:** Workspace → Project → Document; each segment clickable.
- **Back:** If user arrived from list, “Back” can go to project or workspace home; preserve in history.
- **Keyboard:** Cmd+K (quick switcher), Cmd+S (save), Escape (close modal/sidebar). Document shortcuts (e.g. Cmd+B for bold) handled by TipTap.

### 7.3 Deep links

- Support direct URLs to document: `/w/{workspace}/p/{project}/doc/{id}`.
- Resolve workspace/project from slug in layout; load document by ID; if no access, show 404.
- Optional: support `/doc/{id}` with redirect after resolving workspace/project for shorter links.

---

## 8. Accessibility & Performance

### 8.1 Accessibility

- **Semantic HTML:** Use `<main>`, `<nav>`, `<aside>`, headings in order; buttons for actions, links for navigation.
- **Focus:** Visible focus ring; trap focus in modals; return focus on close; skip link to main content.
- **ARIA:** `aria-label` on icon-only buttons; `aria-expanded` for sidebar/tree; `aria-live` for “Saved” / errors.
- **Keyboard:** All actions available via keyboard; avoid mouse-only interactions.
- **Color:** Sufficient contrast (WCAG AA); do not rely on color alone for status (e.g. “Saved” + icon).

### 8.2 Performance

- **Code splitting:** Lazy-load editor, chart libs, and heavy deps; use dynamic imports with named exports where possible.
- **Images:** Use `next/image`; specify dimensions or `fill`; use blur placeholder for avatars.
- **Fonts:** Use `next/font`; preload critical font; avoid layout shift (reserve space or use `size-adjust`).
- **Lists:** Virtualize long doc trees (e.g. react-virtual) if a project has hundreds of items.
- **Avoid waterfalls:** Fetch workspace + projects in parallel in layout; prefetch document on link hover.

---

## 9. Design System & Theming (Attio/Linear-style)

The design system enforces a **clean, minimal** look: neutrals + one accent, typography-led hierarchy, subtle borders, no decorative clutter.

### 9.1 Color tokens

- **Backgrounds:** One base background (app canvas), one elevated surface (sidebar, modals, dropdowns). Very close in tone; distinction via border or 1-step shade, not strong contrast.
- **Text:** Primary text (high contrast), secondary/muted (mid gray). No colored text except links and rare status (e.g. success/error).
- **Borders:** Single border color, low opacity or light gray; hairline (1px). Use sparingly to separate regions, not to decorate.
- **Accent:** One primary/accent color (e.g. desaturated blue `#5E6AD2` or similar). Used for: primary buttons, links, focus ring, selected state. No second accent.
- **Semantic:** Success, warning, error only where needed; muted, not saturated.

**Example (light):** `--bg: #FAFAFA`, `--surface: #FFFFFF`, `--text: #0F0F0F`, `--text-muted: #737373`, `--border: #E5E5E5`, `--accent: #5E6AD2`.

**Example (dark):** `--bg: #0D0D0D`, `--surface: #171717`, `--text: #FAFAFA`, `--text-muted: #A3A3A3`, `--border: #262626`, `--accent: #818CF8`.

### 9.2 Typography

- **Font:** One primary sans-serif (e.g. **Geist**, **Satoshi**, or **Inter** only if needed for compatibility). Mono only for code and IDs.
- **Scale:** Restrained: 12px (captions, metadata), 14px (body, list items), 16px (doc body, inputs), 18–20px (page titles). No large display sizes in app UI.
- **Weight:** Regular (400) for body; medium (500) for emphasis and labels; semibold (600) for headings and primary actions. Avoid bold (700) except rare emphasis.
- **Line-height:** ~1.5 for body; slightly tighter for dense lists (1.4). Generous for doc content (1.6).
- **Letter-spacing:** Default; no decorative tracking.

### 9.3 Spacing & layout

- **Base scale:** 4px (e.g. 4, 8, 12, 16, 24, 32, 48). Use 8/16/24 for component padding; 24/32 for section gaps.
- **Radii:** Small and consistent: 6px for buttons, inputs, chips; 8px for cards and modals. No large rounded corners.
- **Shadows:** Minimal. One soft shadow for modals/dropdowns (e.g. `0 4px 12px rgba(0,0,0,0.08)`); avoid multiple layers or strong depth.

### 9.4 Theming

- **Light/dark:** Class-based (e.g. `.dark`) on `<html>`. All tokens in `:root` and `.dark`; no inline theme logic.
- **Persistence:** Theme in localStorage, apply on load to avoid flash; optional sync to user profile.

### 9.5 Component guidelines (minimal style)

- **Buttons:** Primary = solid accent, no heavy shadow. Secondary/ghost = transparent, border or none; hover = subtle background. Danger = muted red. One height (e.g. 32px), consistent horizontal padding.
- **Inputs:** Light border, clear focus ring (accent, 2px). Label above or floating; placeholder and helper in muted text. No decorative icons unless functional.
- **Cards / list rows:** Background = surface; border or divider only when needed. Hover = very subtle background change (e.g. 2–4% opacity). No card shadows in default list views.
- **Sidebar:** Same surface as app; thin vertical border to separate. Nav items: icon + label; active state = subtle background or left border accent, not bold color.
- **Modals / panels:** Surface background, single soft shadow, 8px radius. Header: title (semibold), optional close; body with consistent padding.
- **Editor:** Document background matches app surface; text color = primary. Toolbar: icon-only or minimal labels; same border/background rules. Code blocks: mono font, one muted background tint.

**Best practices**

- Prefer a **small set of primitives** (Button, Input, Card, Modal) and compose; avoid one-off styles.
- When in doubt, remove: fewer borders, fewer colors, and more whitespace align with Attio/Linear.
- Document tokens and components in a simple style guide or Storybook so design and implementation stay aligned.

---

## 10. Testing & Quality

### 10.1 Unit tests

- **Utils:** Path normalization, slug generation, validation helpers.
- **Hooks:** Custom hooks (e.g. useWorkspace, useDocument) with mocked tRPC/fetch.
- **Components:** Presentational components (buttons, breadcrumb) with React Testing Library.

### 10.2 Integration tests

- **Flows:** Login → open workspace → open project → open doc (with mocked API and optional mock Yjs).
- **Editor:** Load doc, type, switch mode, save (mock provider and API).

### 10.3 E2E (optional for MVP)

- **Playwright or Cypress:** Sign up, create workspace, create doc from template, edit and save; run in CI on main.

### 10.4 Quality

- **TypeScript:** Strict mode; no `any` for public APIs; shared types between frontend and API.
- **Lint:** ESLint (Next, React, a11y); Prettier for format.
- **Errors:** Use error boundaries; log to Sentry (or similar); show user-friendly message and recovery action.

---

*Keep this document in sync with the codebase and with the DB and API docs so that data flow and permissions stay consistent.*
