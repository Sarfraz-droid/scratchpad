# Scratchpad — Product Doc

## 1. Problem

Ideas start scattered across chat threads, note apps, moodboards, and PDFs. There's
no single place to dump raw material, arrange it visually, and think out loud with
an AI that can see everything you've collected.

## 2. Product

Scratchpad is a workspace built around **projects**. Each project bundles:

- **Canvas** — an infinite tldraw board for images, sticky notes, drawings, and
  placed PDFs/documents. This is the visual "second brain" surface.
- **Files** — uploaded assets (images, PDFs, docs) attached to the project.
- **Notes** — short structured text cards (vision, target users, differentiation…).
- **Chat (Idea Copilot)** — a persistent side chat, scoped to the project, that can
  read the project's notes/files/canvas as context and help brainstorm, summarize,
  or plan next steps.

Layout mirrors the reference: a left sidebar listing projects, a central tabbed
workspace (Canvas / Files / Notes), and a chat panel docked on the right.

## 3. Non-goals (v1)

- Multi-user real-time collaboration (cursors, presence) — schema allows for it
  later (projects are already row-scoped), but v1 is single-user.
- Fine-grained auth/permissions — v1 has no login; Supabase RLS policies are
  scaffolded but permissive.
- Streaming chat responses — v1 calls the model once per message and returns the
  full reply.

## 4. Architecture

Turborepo monorepo, Bun workspaces.

```
apps/
  web/     React + Vite + Tailwind + shadcn/ui + Zustand + React Router + tldraw
  server/  Elysia + Scalar (via @elysiajs/swagger) + LangChain + Supabase
packages/
  shared/  Framework-agnostic TypeScript types shared by both apps
supabase/
  migrations/  SQL schema (projects, chats, chat_messages, canvas_documents,
               project_files, project_notes)
```

**Frontend → Backend**: `apps/web` calls `apps/server`'s REST API under `/api/*`
(proxied through Vite in dev). API docs are served at `/docs` via Scalar.

**AI**: `apps/server/src/lib/langchain.ts` wraps LangChain's `ChatOpenAI` client,
pointed at OpenRouter's OpenAI-compatible endpoint (`OPENROUTER_BASE_URL`). Swapping
models is a one-line env var change (`OPENROUTER_MODEL`), and swapping providers
away from OpenRouter only touches this one file.

**Data**: Supabase Postgres holds all project data; the server uses the
service-role key, the browser (if it talks to Supabase directly for anything, e.g.
Storage) uses the anon key.

**Canvas persistence**: the tldraw store snapshot for a project is serialized to
JSON and stored in `canvas_documents.snapshot` (`jsonb`), loaded/saved through
`GET/PUT /api/canvas/:projectId`.

## 5. Data model (see `supabase/migrations/0001_init.sql`)

`projects` → `chats` → `chat_messages`, plus `canvas_documents`, `project_files`,
`project_notes`, all foreign-keyed to `projects.id` with `on delete cascade`.

## 6. Status of this scaffold

This repo is a **structural scaffold**: every package, config file, route, and
component listed above exists and is wired together, but feature logic is stubbed
with `TODO` comments rather than fully implemented — see `docs/SETUP.md` for exactly
what to fill in first.
