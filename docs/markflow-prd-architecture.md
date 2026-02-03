# MarkFlow

## The Founder's Growth Engine

**Your Daily Driver for Building, Documenting, and Scaling Startups**

**Product Requirements Document & Technical Architecture**

*Version 2.0 — February 2026*

---

## Table of Contents

**PART I: PRODUCT REQUIREMENTS**
1. Executive Summary
2. Problem Statement
3. Target Users & Personas
4. Core Features
5. User Stories
6. MVP Definition
7. Success Metrics

**PART II: TECHNICAL ARCHITECTURE**
8. System Overview
9. Technology Stack
10. Architecture Components
11. Data Model
12. Real-Time Collaboration Engine
13. GitHub Integration
14. AI Agent Integration
15. Security & Authentication
16. Cost Optimization Strategy
17. Deployment & Infrastructure
18. Development Roadmap
19. Positioning & Go-To-Market

---

# PART I: PRODUCT REQUIREMENTS DOCUMENT

---

## 1. Executive Summary

MarkFlow is the **Founder's Growth Engine** — a unified workspace where technical founders and their non-technical co-founders collaborate seamlessly on everything that matters: PRDs, roadmaps, investor decks, meeting notes, and project documentation. 

Unlike Google Docs (no code support, no GitHub sync) or Notion (complex, slow, overkill), MarkFlow is purpose-built for startup velocity. Technical users get native Markdown with real-time collaboration and GitHub sync. Non-technical users get a beautiful WYSIWYG editor that feels like Google Docs — same document, two editing modes, zero friction.

**The Vision:** One workspace where founders think, plan, execute, and scale — with AI as their co-pilot.

### 1.1 Core Value Proposition

- **Dual-mode editing:** Technical users write Markdown, non-technical partners edit in WYSIWYG — same doc, real-time sync
- **Founder's daily driver:** PRDs, roadmaps, meeting notes, OKRs, investor updates — all in one place
- **GitHub-native:** Code docs stay in sync with your repo automatically
- **AI co-pilot ready:** One-click export to Claude/GPT, future MCP integration for autonomous doc updates
- **Real-time collaboration:** Google Docs-style cursors, presence, and instant sync
- **Startup-friendly pricing:** Free tier handles most early-stage needs

### 1.2 Why "Founder's Growth Engine"?

Founders don't just need a doc tool — they need a **thinking and execution environment**. MarkFlow is designed around the founder's workflow:

| Founder Activity | How MarkFlow Helps |
|------------------|---------------------|
| **Planning** | PRD templates, roadmap docs, OKR tracking with interactive checklists |
| **Building** | GitHub sync keeps technical docs current, AI export accelerates development |
| **Collaborating** | Real-time editing with co-founders, investors, advisors — each in their preferred mode |
| **Fundraising** | Investor update templates, deck outlines, data room organization |
| **Scaling** | Team onboarding docs, process documentation, knowledge base |
| **Reflecting** | Meeting notes, decision logs, weekly reviews with task tracking |

---

## 2. Problem Statement

### 2.1 Current Pain Points

| Pain Point | Who Feels It | Description |
|------------|--------------|-------------|
| **Tool Fragmentation** | All Founders | Docs in Google Docs, tasks in Linear, notes in Notion, code docs in GitHub. Context is everywhere and nowhere. |
| **Technical/Non-Technical Divide** | Co-founder Teams | Technical founder writes Markdown, non-technical co-founder can't edit without breaking formatting. Collaboration friction kills velocity. |
| **Google Docs Limitations** | Technical Founders | No native Markdown, poor code formatting, no syntax highlighting, doesn't integrate with dev workflow. |
| **Notion Complexity** | Solo Founders | Overkill for early-stage. Databases, relations, rollups — when you just need to write and ship. |
| **GitHub Friction** | Dev Teams | Editing docs requires commit cycles. No real-time collaboration. PR workflow is slow for documentation. |
| **AI Agent Handoff** | AI Power Users | No standardized way to share project context with AI. Manual file gathering is tedious. |
| **No Single Source of Truth** | Scaling Teams | Meeting notes scattered, decisions undocumented, new hires can't find anything. |

### 2.2 The Founder's Dilemma

**Scenario:** You're a technical founder with a non-technical co-founder (business, design, or operations). You write a PRD in Markdown because it's version-controlled and works with your dev workflow. Your co-founder opens it and sees:

```markdown
## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/{id}` | Fetch user |
```

They want to add a row to the table. They accidentally delete a pipe character. The table breaks. Frustration ensues. They ask you to "just put it in Google Docs."

**MarkFlow solves this.** Your co-founder clicks "Edit" and sees a beautiful rendered table. They add a row using a familiar interface. The Markdown updates automatically. Both of you work in your preferred mode, on the same document, in real-time.

### 2.3 Market Gap

| Tool | Strengths | Gaps |
|------|-----------|------|
| **Google Docs** | Real-time collab, familiar UI | No Markdown, no GitHub, no code support |
| **Notion** | Databases, wiki features | Complex, slow, no true Markdown, weak GitHub |
| **Obsidian** | Excellent Markdown, local-first | No real-time collab, single-user focused |
| **HackMD** | Markdown + collab | No project management, no WYSIWYG mode |
| **GitHub** | Version control, dev workflow | No real-time editing, technical users only |

**MarkFlow fills the gap:** Real-time collaboration + Dual-mode editing + GitHub sync + AI-ready + Founder-focused templates and workflows.

---

## 3. Target Users & Personas

### 3.1 Primary Persona: Technical Founder

- **Demographics:** 25-45, technical background, building a startup (solo or with co-founders)
- **Goals:** Ship fast, keep docs current, collaborate with non-technical partners, leverage AI
- **Pain:** Tools don't bridge the technical/non-technical gap. Context switching kills flow.
- **Value:** Single workspace for everything, GitHub sync, AI export, co-founder can edit without breaking things
- **Daily Use:** PRDs, technical specs, meeting notes, roadmaps, investor updates

### 3.2 Primary Persona: Non-Technical Co-Founder

- **Demographics:** 25-50, business/design/ops background, works closely with technical founder
- **Goals:** Contribute to docs without learning Markdown, stay in sync with technical progress
- **Pain:** Markdown is intimidating, tables break when edited, feels excluded from "dev tools"
- **Value:** WYSIWYG editing that "just works," real-time collab with technical partner, familiar Google Docs-like experience
- **Daily Use:** Business plans, investor decks, meeting notes, OKRs, hiring docs

### 3.3 Secondary Persona: Solo Indie Hacker

- **Demographics:** 25-40, tech-savvy, works on personal projects or micro-startups
- **Goals:** Maintain project documentation, track tasks, leverage AI for productivity
- **Pain:** Context switching between IDE, docs, and task management tools
- **Value:** Single platform for all documentation needs, AI-ready file export, lightweight and fast

### 3.4 Secondary Persona: Small Dev Team (2-10 people)

- **Demographics:** Startup teams, agency developers, open source contributors
- **Goals:** Collaborative docs, shared knowledge base, streamlined reviews
- **Pain:** Docs get stale, collaboration is async-heavy, onboarding is slow
- **Value:** Real-time editing, GitHub sync, automatic commit on save, team knowledge base

### 3.5 Tertiary Persona: AI Power User

- **Demographics:** Uses Claude/GPT daily, builds with AI agents
- **Goals:** Feed project context to AI efficiently, automate doc updates
- **Pain:** Manually copying files to AI, losing context between sessions
- **Value:** One-click export, AI-friendly file structure, context bundling, future MCP integration

---

## 4. Core Features

### 4.1 Dual-Mode Editor (The Core Innovation)

The dual-mode editor is MarkFlow's key differentiator — enabling technical and non-technical users to work on the same document in their preferred editing mode, with real-time sync.

| Feature | Description | Priority |
|---------|-------------|----------|
| **WYSIWYG Mode** | Rich-text editing like Google Docs — click to edit, visual formatting toolbar, no Markdown syntax visible | P0 - MVP |
| **Markdown Mode** | Raw Markdown editing with syntax highlighting for technical users | P0 - MVP |
| **Mode Toggle** | One-click switch between WYSIWYG and Markdown (per user, not per doc) | P0 - MVP |
| **Hybrid View** | Side-by-side: Markdown on left, live preview on right (optional) | P0 - MVP |
| **Live Collaboration** | Multiple cursors, presence indicators, instant sync — works across modes | P0 - MVP |
| **Visual Table Editor** | Click-to-edit tables in WYSIWYG, renders as GFM Markdown | P0 - MVP |
| **Slash Commands** | Type "/" for quick formatting (headings, lists, code blocks) — works in both modes | P1 |
| **Comments** | Inline comments and discussions | P1 |
| **Version History** | Track changes with visual diff | P1 |

#### 4.1.1 How Dual-Mode Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    SAME DOCUMENT (Yjs CRDT)                     │
│                                                                 │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │   Technical User    │       │  Non-Technical User │         │
│  │   (Markdown Mode)   │       │   (WYSIWYG Mode)    │         │
│  │                     │       │                     │         │
│  │  ## Heading         │  ←→   │  [H2] Heading       │         │
│  │  - [ ] Task item    │  ←→   │  ☐ Task item        │         │
│  │  | Col A | Col B |  │  ←→   │  [Visual Table]     │         │
│  └─────────────────────┘       └─────────────────────┘         │
│                                                                 │
│            Real-time sync via Yjs (both directions)             │
└─────────────────────────────────────────────────────────────────┘
```

- **Underlying format:** Always Markdown (GFM). WYSIWYG is a rendering/editing layer on top.
- **No data loss:** Switching modes never loses content. Markdown is the source of truth.
- **User preference:** Each user's mode preference is saved. Document opens in their preferred mode.

#### 4.1.2 WYSIWYG Feature Parity

Non-technical users should be able to do everything without seeing Markdown:

| Action | WYSIWYG Behavior |
|--------|------------------|
| Bold/Italic | Toolbar buttons or Cmd+B/I |
| Headings | Dropdown or type # then space (auto-converts) |
| Lists | Toolbar or type - then space |
| Checkboxes | Click to toggle, toolbar to insert |
| Tables | Visual grid editor, add row/column buttons |
| Links | Popup to enter URL, or paste URL on selected text |
| Images | Drag-and-drop or upload button |
| Code blocks | Toolbar button, select language from dropdown |
| Blockquotes | Toolbar button or > then space |

### 4.2 Founder's Toolkit (Templates & Workflows)

Pre-built templates and workflows designed for the startup journey.

| Feature | Description | Priority |
|---------|-------------|----------|
| **PRD Template** | Product requirements document with sections, checklist | P0 - MVP |
| **Meeting Notes** | Date-stamped notes with action items extraction | P0 - MVP |
| **OKR Tracker** | Objectives and key results with progress tracking | P1 |
| **Investor Update** | Monthly investor update template with metrics sections | P1 |
| **Roadmap** | Visual roadmap document with milestones and status | P1 |
| **Decision Log** | Record decisions with context, alternatives, rationale | P1 |
| **Weekly Review** | Reflection template: wins, learnings, next week focus | P2 |
| **Pitch Deck Outline** | Slide-by-slide outline for fundraising | P2 |
| **Team Onboarding** | New hire checklist and company overview template | P2 |

### 4.3 Project & File Management

| Feature | Description | Priority |
|---------|-------------|----------|
| Workspace | Container for all your startup's docs (like a company) | P0 - MVP |
| Projects | Organize by product, initiative, or category | P0 - MVP |
| Folder Hierarchy | Nested folders for organization | P0 - MVP |
| Quick Switcher | Cmd+K to jump to any document | P0 - MVP |
| File Search | Full-text search across all documents | P1 |
| Bookmarks/Favorites | Pin frequently used files | P2 |
| Recent Files | Quick access to recently edited docs | P0 - MVP |

### 4.4 GitHub Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| Repo Connect | OAuth link to GitHub repos | P0 - MVP |
| Auto-Sync | Bi-directional sync with configurable frequency | P0 - MVP |
| Branch Support | Work on different branches, merge conflicts | P1 |
| PR Integration | Create PRs for doc changes directly | P1 |
| Commit History | View and restore from Git history | P2 |

*Note: GitHub integration is optional. Non-technical users can use MarkFlow without ever connecting to GitHub.*

### 4.5 Checklist & Task Management

| Feature | Description | Priority |
|---------|-------------|----------|
| Interactive Checklists | Click to toggle in both modes, syncs to Markdown | P0 - MVP |
| Progress Tracking | Visual progress bar per document | P1 |
| Action Item Extraction | AI-powered extraction of action items from meeting notes | P2 |
| Due Dates | Optional dates on checklist items | P2 |
| Assignees | Assign items to team members | P2 |
| Aggregated View | Dashboard of all tasks across project (Founder's Dashboard) | P2 |

### 4.6 AI Agent Integration

| Feature | Description | Priority |
|---------|-------------|----------|
| Export Bundle | One-click export of project files for AI | P0 - MVP |
| Context Manifest | Auto-generate context file for agents | P1 |
| AI Writing Assistant | In-editor AI suggestions (expand, summarize, improve) | P1 |
| MCP Integration | Model Context Protocol server for Claude | P1 |
| API Access | REST API for programmatic file access | P1 |
| Webhook Triggers | Notify AI agents on doc changes | P2 |

### 4.7 Collaboration & Sharing

| Feature | Description | Priority |
|---------|-------------|----------|
| Real-time Cursors | See collaborators' cursors with names | P0 - MVP |
| Presence Indicators | See who's viewing/editing each doc | P0 - MVP |
| Share Links | Public or password-protected sharing | P1 |
| Guest Access | Invite external collaborators (advisors, investors) with limited access | P1 |
| Export to PDF | Clean PDF export for sharing externally | P1 |
| Export to Notion/Docs | Migration path to other tools | P2 |

---

## 5. User Stories

### 5.1 MVP User Stories — Technical Founder

1. **As a technical founder,** I want to write PRDs in Markdown so they're version-controlled and structured.
2. **As a technical founder,** I want to see my co-founder's cursor in real-time so we can collaborate on docs together.
3. **As a technical founder,** I want to connect my GitHub repo so technical docs stay in sync with my codebase.
4. **As a technical founder,** I want interactive checklists so I can track tasks directly in my documents.
5. **As a technical founder,** I want to export project files for AI so I can get help from Claude/GPT.
6. **As a technical founder,** I want to switch to raw Markdown view when I need precise control over formatting.

### 5.2 MVP User Stories — Non-Technical Co-Founder

1. **As a non-technical co-founder,** I want to edit documents in WYSIWYG mode so I don't have to learn Markdown.
2. **As a non-technical co-founder,** I want to edit tables visually so I can add rows without breaking formatting.
3. **As a non-technical co-founder,** I want to toggle checkboxes by clicking so I can track my tasks easily.
4. **As a non-technical co-founder,** I want the editor to feel like Google Docs so I don't have to learn a new tool.
5. **As a non-technical co-founder,** I want to add comments to specific sections so I can give feedback without editing.
6. **As a non-technical co-founder,** I want to work on the same document as my technical partner without conflicts.

### 5.3 MVP User Stories — Common

1. **As a founder,** I want to create documents from templates (PRD, meeting notes) so I can start quickly.
2. **As a founder,** I want to organize docs in projects and folders so I can find things easily.
3. **As a founder,** I want to invite team members to my workspace so we can collaborate.
4. **As a founder,** I want quick keyboard navigation (Cmd+K) so I can jump between docs efficiently.

### 5.4 Post-MVP User Stories

1. **As a founder,** I want to see version history so I can revert to previous states.
2. **As a founder,** I want an OKR template with progress tracking so I can manage company goals.
3. **As a founder,** I want to share docs with investors via a link so they can view without creating an account.
4. **As a technical founder,** I want branch support so I can isolate documentation changes.
5. **As a power user,** I want MCP integration so Claude can directly read/write my docs.
6. **As a founder,** I want a dashboard showing all my open tasks across documents so I have a unified view.

---

## 6. MVP Definition

### 6.1 In Scope (MVP)

**Dual-Mode Editor:**
- WYSIWYG editing mode (the primary mode for non-technical users)
- Markdown editing mode (for technical users)
- One-click mode toggle (user preference saved)
- Visual table editor (works in both modes)
- Real-time collaborative editing (CRDT-based, works across modes)
- Interactive checklists (click to toggle)
- Syntax highlighting for code blocks

**Core Platform:**
- User authentication (GitHub OAuth + Email/Password for non-technical users)
- Workspace and project management
- Folder/file hierarchy
- Quick switcher (Cmd+K)
- Recent files

**GitHub Integration:**
- Repo connection (OAuth)
- Auto-sync to/from GitHub (single branch)
- *Note: Optional — non-technical users can use MarkFlow without GitHub*

**Founder's Toolkit:**
- PRD template
- Meeting notes template
- Export for AI (zip download)
- Workspace member invitations

### 6.2 Out of Scope (Post-MVP)

- Branch switching and merge conflict UI
- PR creation from within app
- Inline comments and discussions (P1)
- Version history UI (P1)
- OKR template with progress tracking
- Investor update template
- Share links (public/password)
- MCP server implementation
- Task aggregation dashboard
- AI writing assistant
- Mobile app
- PDF export

---

## 7. Success Metrics

### 7.1 Core Metrics

| Metric | Target (3 months post-launch) | Measurement |
|--------|-------------------------------|-------------|
| Active Users | 500 monthly active users | Analytics |
| Retention | 40% week-1 retention | Cohort analysis |
| Collaboration Rate | 40% of workspaces have 2+ members | Database query |
| WYSIWYG Adoption | 30% of edits happen in WYSIWYG mode | Event tracking |
| Mode Diversity | 20% of docs edited in both modes | Event tracking |

### 7.2 Founder's Growth Engine Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Docs per workspace | 10+ average | Indicates daily driver adoption |
| Weekly active days | 4+ days/week for active users | Shows it's becoming a habit |
| Template usage | 50% of new docs from templates | Validates founder toolkit value |
| Cross-mode collaboration | 15% of sessions involve both modes | Proves technical/non-technical bridge works |
| AI Export usage | 25% use monthly | Shows AI co-pilot positioning resonates |

### 7.3 Non-Technical User Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| WYSIWYG-only users | 20% of total users never switch to Markdown | Event tracking |
| Table edit success rate | <5% of table edits cause formatting issues | Error tracking |
| Time to first edit | <30 seconds from opening doc | Event tracking |
| Onboarding completion | 80% complete first doc without help | Funnel analysis |

---

# PART II: TECHNICAL ARCHITECTURE

---

## 8. System Overview

MarkFlow follows a serverless-first architecture optimized for cost efficiency while maintaining performance. The system uses CRDT (Conflict-free Replicated Data Types) for real-time collaboration, eliminating the need for complex operational transformation servers.

### 8.1 Architecture Principles

- **Serverless-first:** Pay only for what you use, automatic scaling
- **Edge-optimized:** Global CDN distribution, low latency everywhere
- **CRDT-based sync:** Peer-to-peer capable, server only for relay
- **Event-driven:** Loosely coupled, easy to extend
- **Open standards:** Use existing protocols where possible

---

## 9. Technology Stack

### 9.1 Recommended Stack (Cost-Optimized)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 + React | SSR, file-based routing, excellent DX, free Vercel hosting tier |
| Editor | TipTap + Yjs | TipTap is ProseMirror-based (extensible), Yjs provides CRDT |
| Real-time | PartyKit or Hocuspocus | PartyKit: edge-native WebSocket (free tier). Hocuspocus: self-hostable |
| Database | Supabase (PostgreSQL) | Free tier generous, built-in auth, real-time subscriptions |
| Auth | Supabase Auth + GitHub OAuth | Integrated with DB, handles GitHub OAuth seamlessly |
| File Storage | Supabase Storage / Cloudflare R2 | R2 has no egress fees, Supabase storage integrates well |
| API Layer | Next.js API Routes / tRPC | tRPC for type-safe APIs, co-located with frontend |
| Background Jobs | Inngest / QStash | Serverless-friendly, handles GitHub sync, retries built-in |
| Deployment | Vercel | Excellent Next.js support, free tier, edge functions |
| Monitoring | Vercel Analytics + Sentry | Built-in analytics, Sentry free tier for errors |

### 9.2 Cost Comparison

| Component | Recommended | Alternative | Monthly Cost (Est.) |
|-----------|-------------|-------------|---------------------|
| Hosting | Vercel Free/Pro | Railway, Fly.io | $0-20 |
| Database | Supabase Free | PlanetScale, Neon | $0-25 |
| Real-time Server | PartyKit Free | Hocuspocus (self-host) | $0-10 |
| Storage | Supabase / R2 | S3 | $0-5 |
| Background Jobs | Inngest Free | BullMQ (self-host) | $0-10 |
| **Total (MVP)** | | | **$0-70/month** |

---

## 10. Architecture Components

### 10.1 High-Level Architecture Diagram

The architecture follows a three-tier model with clear separation between the client application, API/real-time layer, and data persistence.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Next.js   │  │   TipTap    │  │    Yjs      │                 │
│  │   (React)   │  │   Editor    │  │   (CRDT)    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │  HTTP/REST      │   WebSocket     │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API / REAL-TIME LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Next.js    │  │  PartyKit   │  │   Inngest   │                 │
│  │  API Routes │  │  (WebSocket)│  │   (Jobs)    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │  Supabase   │  │  Supabase   │  │   GitHub    │                 │
│  │  PostgreSQL │  │   Storage   │  │     API     │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Component Responsibilities

- **Next.js Frontend:** UI rendering, routing, authentication flow, API calls
- **TipTap Editor:** Rich text editing, Markdown parsing, syntax highlighting, WYSIWYG rendering
- **Yjs (CRDT):** Document state, conflict resolution, offline support
- **PartyKit:** WebSocket server, presence, document relay
- **Next.js API:** Business logic, GitHub integration, export endpoints
- **Inngest:** GitHub sync jobs, scheduled tasks, webhook processing
- **Supabase:** User data, project metadata, file storage, auth

### 10.3 Dual-Mode Editor Architecture

The dual-mode editor is the technical core of MarkFlow's value proposition. Here's how it works:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TIPTAP EDITOR INSTANCE                          │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Yjs Document (CRDT)                       │   │
│  │                  [Source of Truth - Markdown AST]            │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              │                                      │
│              ┌───────────────┴───────────────┐                     │
│              ▼                               ▼                      │
│  ┌─────────────────────┐       ┌─────────────────────┐             │
│  │   WYSIWYG View      │       │   Markdown View     │             │
│  │   (Rich Rendering)  │       │   (Source Code)     │             │
│  │                     │       │                     │             │
│  │  - Visual toolbar   │       │  - Syntax highlight │             │
│  │  - Click to edit    │       │  - Line numbers     │             │
│  │  - Drag-drop tables │       │  - Raw editing      │             │
│  └─────────────────────┘       └─────────────────────┘             │
│                                                                     │
│  User preference toggle: [WYSIWYG] | [Markdown] | [Split]          │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Implementation Details:**

1. **Single Yjs Document:** Both views read/write to the same Yjs CRDT document
2. **TipTap Flexibility:** TipTap supports both rich-text rendering and raw Markdown view via extensions
3. **Mode Persistence:** User's preferred mode stored in localStorage + profile settings
4. **Real-time Sync:** When User A edits in WYSIWYG, User B sees changes in Markdown view instantly
5. **Markdown-First:** All content serializes to standard GFM Markdown for GitHub compatibility

**TipTap Extensions Required:**

| Extension | Purpose |
|-----------|---------|
| `@tiptap/extension-markdown` | Markdown serialization/parsing |
| `@tiptap/extension-table` | Visual table editing |
| `@tiptap/extension-task-list` | Interactive checkboxes |
| `@tiptap/extension-code-block-lowlight` | Syntax highlighting |
| `@tiptap/extension-collaboration` | Yjs integration |
| `@tiptap/extension-collaboration-cursor` | Multi-user cursors |
| Custom extension | Markdown source view toggle |

---

## 11. Data Model

### 11.1 Core Entities

The database schema is designed for simplicity and query efficiency. Supabase PostgreSQL with Row Level Security (RLS) handles access control.

```sql
-- Users (handled by Supabase Auth)
-- profiles table extends auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  github_token_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  name TEXT NOT NULL,
  github_repo TEXT,  -- owner/repo format
  github_branch TEXT DEFAULT 'main',
  sync_enabled BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  parent_id UUID REFERENCES documents(id),  -- for folders
  type TEXT CHECK (type IN ('file', 'folder')),
  name TEXT NOT NULL,
  path TEXT NOT NULL,  -- full path from root
  content_yjs BYTEA,  -- Yjs document state
  content_md TEXT,  -- Rendered markdown for search
  github_sha TEXT,  -- Last synced commit SHA
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 11.2 Entity Relationship

```
User (1) ─────< (N) Workspace
Workspace (1) ─< (N) Project
Project (1) ───< (N) Document
Document (1) ──< (N) Document (self-ref for folders)
Workspace (N) ─< (N) User (via workspace_members)
```

---

## 12. Real-Time Collaboration Engine

### 12.1 Why CRDTs over OT

| Aspect | CRDT (Yjs) | OT (e.g., ShareDB) |
|--------|------------|---------------------|
| Server Role | Relay only, no computation | Must transform operations |
| Offline Support | Native, merge on reconnect | Complex, requires queue |
| P2P Capable | Yes, WebRTC possible | No, server required |
| Scaling | Stateless servers, easy | Stateful, complex |
| Cost | Lower (less compute) | Higher (more compute) |

### 12.2 Yjs Integration Architecture

- **y-prosemirror:** Binds Yjs to TipTap/ProseMirror for real-time editing
- **y-partykit:** Provider for PartyKit WebSocket connection
- **y-indexeddb:** Local persistence for offline editing

Document state is stored as Yjs binary (content_yjs in DB). On save, we also extract plain Markdown for search indexing. The Yjs document is the source of truth.

### 12.3 Presence & Cursors

PartyKit provides awareness protocol support. Each connected client broadcasts their cursor position, selection, and user info. The editor displays colored cursors with user names.

---

## 13. GitHub Integration

### 13.1 Connection Flow

1. User initiates GitHub OAuth from project settings
2. App requests 'repo' scope for read/write access
3. Token is encrypted and stored in profiles.github_token_encrypted
4. User selects repository from list of available repos
5. Initial sync pulls all .md files from selected branch

### 13.2 Sync Strategy

| Direction | Strategy |
|-----------|----------|
| GitHub → MarkFlow | Webhook on push events. Inngest job fetches changed files, updates Yjs docs. Conflicts show diff UI. |
| MarkFlow → GitHub | Debounced auto-commit (5 min idle) or manual save. Uses GitHub Contents API to update files. |
| Conflict Resolution | MVP: last-write-wins with notification. Post-MVP: visual merge UI. |

### 13.3 GitHub API Usage

Endpoints used: `GET /repos/{owner}/{repo}/contents/{path}` for reading, `PUT /repos/{owner}/{repo}/contents/{path}` for writing, `GET /repos/{owner}/{repo}/git/trees/{sha}?recursive=1` for initial sync. Rate limit is 5000/hour for authenticated requests, sufficient for typical usage.

---

## 14. AI Agent Integration

### 14.1 Export Bundle Format

One-click export generates a ZIP file optimized for AI consumption. The bundle includes a manifest file describing the project structure.

```
project-export/
├── MANIFEST.md          # AI-readable project summary
├── docs/
│   ├── README.md
│   ├── architecture.md
│   └── api/
│       └── endpoints.md
└── tasks/
    └── TODO.md          # Extracted checklists
```

### 14.2 MANIFEST.md Template

```markdown
# Project: {project_name}
Generated: {timestamp}

## Structure
{file tree}

## Key Files
- README.md: Project overview
- architecture.md: Technical design

## Open Tasks
{aggregated incomplete checklist items}
```

### 14.3 Future: MCP Server

Post-MVP, implement an MCP (Model Context Protocol) server that allows Claude to directly access and modify documents. This enables workflows like "Claude, update the API documentation based on the latest code changes."

---

## 15. Security & Authentication

### 15.1 Authentication Flow

- **Primary Options:** 
  - GitHub OAuth (for technical users, enables repo sync)
  - Email/Password or Magic Link (for non-technical users who don't have GitHub)
  - Google OAuth (familiar for non-technical users)
- **Token Storage:** GitHub tokens encrypted with AES-256-GCM before DB storage
- **Session:** JWT tokens, 1-hour expiry, refresh tokens for longevity

*Note: Non-technical users can sign up with email and use all features except GitHub sync.*

### 15.2 Authorization Model

| Role | Scope | Permissions |
|------|-------|-------------|
| Owner | Workspace | Full control: delete workspace, manage members, billing |
| Admin | Workspace | Create/delete projects, invite members |
| Editor | Project | Create/edit/delete documents in project |
| Viewer | Project | Read-only access to documents |

### 15.3 Row Level Security

Supabase RLS policies enforce access control at the database level. Example policy for documents:

```sql
CREATE POLICY "Users can view docs in their workspaces"
ON documents FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    JOIN projects p ON p.workspace_id = wm.workspace_id
    WHERE p.id = documents.project_id
    AND wm.user_id = auth.uid()
  )
);
```

---

## 16. Cost Optimization Strategy

### 16.1 Free Tier Maximization

| Service | Free Tier Limits | Our Usage Pattern |
|---------|------------------|-------------------|
| Vercel | 100GB bandwidth, serverless functions | SSR + API routes, well under limits for MVP |
| Supabase | 500MB DB, 1GB storage, 2M edge functions | Metadata only in DB, Yjs docs are small |
| PartyKit | 100 concurrent connections, 10GB transfer | Sufficient for 100 simultaneous editors |
| Inngest | 25K events/month | GitHub syncs, ~1000 syncs/day possible |

### 16.2 Cost-Saving Techniques

- **Debounced syncs:** Don't sync on every keystroke, wait for 5 seconds of inactivity
- **Binary Yjs storage:** Compact format reduces DB storage
- **Edge caching:** Static assets cached at CDN edge
- **Lazy loading:** Only load document content when opened
- **GitHub rate limits:** Batch API calls, use conditional requests (ETags)

### 16.3 Scaling Costs

| Scale | Users | Monthly Cost | Cost/User |
|-------|-------|--------------|-----------|
| MVP | 0-100 | $0 | $0 |
| Early Growth | 100-1000 | $50-100 | $0.05-0.10 |
| Scale | 1000-10000 | $200-500 | $0.02-0.05 |

---

## 17. Deployment & Infrastructure

### 17.1 Environment Setup

| Environment | Purpose |
|-------------|---------|
| Development | Local: Next.js dev server, local Supabase (Docker), PartyKit dev mode |
| Preview | Vercel preview deployments per PR, separate Supabase project |
| Production | Vercel production, Supabase production project, PartyKit production |

### 17.2 CI/CD Pipeline

1. **Push to GitHub:** Triggers Vercel build
2. **Build:** Next.js build, TypeScript check, ESLint
3. **Test:** Vitest unit tests, Playwright E2E (optional)
4. **Deploy:** Preview URL for PRs, production on main merge
5. **Migrations:** Supabase migrations run via GitHub Actions

### 17.3 Monitoring & Observability

- **Errors:** Sentry (free tier: 5K events/month)
- **Analytics:** Vercel Analytics (free) + Plausible (optional)
- **Uptime:** Better Uptime or similar (free tier available)
- **Logs:** Vercel logs for serverless, Supabase dashboard for DB

---

## 18. Development Roadmap

### 18.1 Phase 1: MVP (8-10 weeks)

| Week | Focus | Deliverables | Est. Hours |
|------|-------|--------------|------------|
| 1-2 | Project setup, auth (GitHub + Email), basic UI | Login, workspace list, onboarding | 45h |
| 3-4 | TipTap + Yjs integration, **WYSIWYG mode** | Rich-text editing works | 55h |
| 5 | **Markdown mode + mode toggle** | Dual-mode editing, user preference | 30h |
| 6 | Visual table editor, checklists | Tables work in both modes | 35h |
| 7 | File management, templates | Folders, PRD template, meeting notes template | 35h |
| 8 | GitHub integration (optional feature) | OAuth, sync working | 30h |
| 9 | AI export, collaboration polish | Export feature, cursors, presence | 25h |
| 10 | Testing, bug fixes, launch prep | QA, docs, marketing site | 25h |

**Total MVP estimate:** 280 hours (~7 weeks full-time, ~10 weeks part-time)

*Note: Increased estimate due to WYSIWYG mode — this is the core differentiator and worth the investment.*

### 18.2 Phase 2: Founder's Toolkit (4-6 weeks)

- OKR template with progress tracking
- Investor update template
- Decision log template
- Inline comments and discussions
- Share links (public/password-protected)
- PDF export
- Version history with visual diff

### 18.3 Phase 3: AI & Collaboration (6-8 weeks)

- AI writing assistant (expand, summarize, improve)
- MCP server implementation (Claude integration)
- Guest access for investors/advisors
- Task aggregation dashboard ("Founder's Dashboard")
- Full-text search
- API for external integrations

### 18.4 Phase 4: Scale (6-8 weeks)

- Branch support and merge UI
- Team billing and plans
- Mobile-responsive improvements
- Notion/Google Docs import
- Advanced permissions (per-doc sharing)
- Webhook integrations

---

## 19. Positioning & Go-To-Market

### 19.1 Positioning Statement

**For startup founders** who need to build, document, and scale their companies, **MarkFlow** is the **founder's growth engine** that provides real-time collaborative documentation with dual-mode editing — letting technical founders write Markdown while non-technical co-founders edit in a familiar WYSIWYG interface. Unlike Google Docs (no code support), Notion (complex and slow), or HackMD (no WYSIWYG), MarkFlow is purpose-built for startup velocity with GitHub sync and AI integration.

### 19.2 Taglines

- **Primary:** "The Founder's Growth Engine"
- **Supporting:** 
  - "Where technical meets non-technical"
  - "Markdown power, Google Docs simplicity"
  - "Your startup's brain, beautifully organized"
  - "Write docs. Ship products. Scale together."

### 19.3 Key Differentiators to Emphasize

| Differentiator | Messaging |
|----------------|-----------|
| Dual-mode editing | "Your co-founder edits visually while you write Markdown — same doc, real-time sync" |
| Founder-focused | "Templates for PRDs, OKRs, investor updates — everything a founder needs" |
| GitHub-native | "Technical docs sync with your repo automatically" |
| AI-ready | "One-click export to Claude/GPT. Your AI co-pilot, fully briefed." |
| Startup-friendly | "Free tier handles most early-stage needs. Scale when you do." |

### 19.4 Target Channels

| Channel | Why | Content |
|---------|-----|---------|
| Indie Hackers | Primary audience hangs out here | "How we built MarkFlow" story, founder workflow tips |
| Twitter/X | Tech founders, indie hackers | Product updates, founder tips, behind-the-scenes |
| Product Hunt | Launch platform | Emphasize dual-mode, founder toolkit angle |
| Hacker News | Technical founders | Architecture deep-dive, open source components |
| Dev.to / Hashnode | Developer audience | "Why we chose CRDT", "Building WYSIWYG on Markdown" |

---

*— End of Document —*
