-- Initial schema for Scratchpad: projects, chats, chat messages, canvas snapshots,
-- files, and notes. Run via `supabase db push` or paste into the SQL editor.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🧠',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  chat_id uuid not null references chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists canvas_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references projects(id) on delete cascade,
  snapshot jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('image', 'pdf', 'document', 'other')),
  size_bytes bigint not null default 0,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_messages_project_id_idx on chat_messages(project_id);
create index if not exists project_files_project_id_idx on project_files(project_id);
create index if not exists project_notes_project_id_idx on project_notes(project_id);

-- Row Level Security: enabled but left permissive (service-role key bypasses RLS
-- anyway from the server). Tighten these policies once you add user auth.
alter table projects enable row level security;
alter table chats enable row level security;
alter table chat_messages enable row level security;
alter table canvas_documents enable row level security;
alter table project_files enable row level security;
alter table project_notes enable row level security;
