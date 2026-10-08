# Scratchpad

A canvas + chat workspace: an infinite tldraw board for images/drawings/PDFs, notes,
files, and a project-scoped AI chat ("Idea Copilot"), per project.

- **Frontend** — `apps/web`: Bun, React, Vite, Tailwind, shadcn/ui, Zustand, React Router, tldraw.
- **Backend** — `apps/server`: Bun, Elysia, Scalar API docs, LangChain (via OpenRouter), Supabase.
- **Shared** — `packages/shared`: TypeScript types used by both apps.

See [`docs/PRODUCT.md`](docs/PRODUCT.md) for the product doc and
[`docs/SETUP.md`](docs/SETUP.md) to get running.

```bash
bun install
bun dev
```
