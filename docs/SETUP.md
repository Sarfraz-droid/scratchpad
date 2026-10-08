# Setup

## 1. Install dependencies

```bash
bun install
```

## 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Fill in:

- `apps/server/.env` — Supabase project URL + **service role** key, OpenRouter API key.
- `apps/web/.env` — Supabase project URL + **anon** key (never the service role key).

## 3. Provision the database

Create a Supabase project, then run `supabase/migrations/0001_init.sql` in the SQL
editor (or via `supabase db push` if you have the Supabase CLI linked).

## 4. Apply the shadcn theme

The reference design uses a tweakcn theme. `apps/web/src/index.css` currently ships
shadcn's default "neutral" tokens as a placeholder. Apply the real theme with:

```bash
cd apps/web
bunx shadcn@latest add https://tweakcn.com/r/themes/cmm7cs846000004jrawis0qi0
```

This overwrites the CSS variable block in `src/index.css`.

## 5. Run

```bash
bun dev
```

This runs both apps via Turborepo:

- `apps/web` → http://localhost:5173
- `apps/server` → http://localhost:4000 (API docs at `/docs`)

## 6. What's stubbed (TODO, in priority order)

1. `apps/web/src/store/useProjectStore.ts` — hydrate from `GET /api/projects` on boot;
   wire the sidebar (`Sidebar.tsx`) to real projects instead of the placeholder list.
2. `apps/web/src/features/chat/ChatPanel.tsx` — wire the Send button to
   `POST /api/chat/:projectId/messages`.
3. `apps/web/src/features/canvas/CanvasView.tsx` — load/save the tldraw snapshot via
   `GET/PUT /api/canvas/:projectId` instead of only using tldraw's local
   `persistenceKey`.
4. `apps/web/src/features/files/FilesPanel.tsx` — file upload to Supabase Storage +
   `GET /api/files/:projectId` listing.
5. `apps/web/src/features/notes/NotesPanel.tsx` — CRUD against `/api/notes/:projectId`.
6. `apps/server/src/routes/chat.ts` — feed project notes/files/canvas summary into
   the LangChain prompt as context; add streaming.
