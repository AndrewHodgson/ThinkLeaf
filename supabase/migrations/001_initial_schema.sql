-- ThinkLeaf cloud schema — run this once in the Supabase SQL editor.
--
-- Storage bucket setup (do this first via the Supabase dashboard):
--   Storage → New bucket → name: "assets", public: off
-- Then run this file in the SQL editor.

-- ── profiles ─────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  version     integer     not null default 1,
  deleted_at  timestamptz,
  synced_at   timestamptz,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

create index if not exists profiles_user_id_idx on profiles (user_id);

alter table profiles enable row level security;

create policy "users access own profiles"
  on profiles for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── projects ──────────────────────────────────────────────────────────────────

create table if not exists projects (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  profile_id  text        not null,
  name        text        not null,
  color       text,
  version     integer     not null default 1,
  deleted_at  timestamptz,
  synced_at   timestamptz,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

create index if not exists projects_user_id_idx on projects (user_id);

alter table projects enable row level security;

create policy "users access own projects"
  on projects for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── folders ───────────────────────────────────────────────────────────────────

create table if not exists folders (
  id               text        primary key,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  profile_id       text        not null,
  project_id       text        not null,
  parent_folder_id text,
  name             text        not null,
  color            text,
  version          integer     not null default 1,
  deleted_at       timestamptz,
  synced_at        timestamptz,
  created_at       timestamptz not null,
  updated_at       timestamptz not null
);

create index if not exists folders_user_id_idx on folders (user_id);

alter table folders enable row level security;

create policy "users access own folders"
  on folders for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── pages ─────────────────────────────────────────────────────────────────────

create table if not exists pages (
  id                 text        primary key,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  profile_id         text        not null,
  project_id         text        not null,
  folder_id          text,
  title              text        not null default '',
  body               text        not null default '',
  note_date          text        not null default '',
  canvas_view_state  jsonb       not null default '{}',
  canvas_objects     jsonb       not null default '[]',
  tags               jsonb       not null default '[]',
  is_favorite        boolean     not null default false,
  version            integer     not null default 1,
  deleted_at         timestamptz,
  synced_at          timestamptz,
  created_at         timestamptz not null,
  updated_at         timestamptz not null
);

create index if not exists pages_user_id_idx on pages (user_id);

alter table pages enable row level security;

create policy "users access own pages"
  on pages for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── assets (metadata — blobs live in Storage) ─────────────────────────────────

create table if not exists assets (
  id          text        primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  mime_type   text        not null,
  version     integer     not null default 1,
  deleted_at  timestamptz,
  synced_at   timestamptz,
  created_at  timestamptz not null,
  updated_at  timestamptz not null
);

create index if not exists assets_user_id_idx on assets (user_id);

alter table assets enable row level security;

create policy "users access own assets"
  on assets for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Storage: assets bucket RLS ────────────────────────────────────────────────
-- Files are stored at  assets/{userId}/{assetId}
-- This policy restricts each user to their own folder.

create policy "users access own asset files"
  on storage.objects for all
  using (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
