-- Markr V1 schema: profiles, shows, buttons, sessions, markers.
-- Paste this whole file into the Supabase SQL Editor and run it once.

-- ---------------------------------------------------------------------
-- profiles: extends Supabase's built-in auth.users with app-specific
-- columns. You can't add columns directly to auth.users, so the "plan"
-- column from the spec lives here instead, one row per user.
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Automatically create a profile row whenever someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- shows
-- ---------------------------------------------------------------------
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  fps numeric not null default 25
    check (fps in (23.976, 24, 25, 29.97, 30, 50, 59.94, 60)),
  created_at timestamptz not null default now()
);

create index shows_user_id_idx on public.shows (user_id);

alter table public.shows enable row level security;

create policy "shows_owner" on public.shows
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- buttons
-- ---------------------------------------------------------------------
create table public.buttons (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  label text not null,
  color text not null
    check (color in ('red', 'orange', 'amber', 'green', 'teal', 'blue', 'purple', 'gray')),
  icon text,
  sort_order integer not null default 0,
  type text not null default 'marker' check (type in ('marker', 'segment')),
  created_at timestamptz not null default now()
);

create index buttons_show_id_idx on public.buttons (show_id);

alter table public.buttons enable row level security;

create policy "buttons_owner" on public.buttons
  for all using (
    exists (select 1 from public.shows where shows.id = buttons.show_id and shows.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.shows where shows.id = buttons.show_id and shows.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  title text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  offset_seconds numeric not null default 0,
  created_at timestamptz not null default now()
);

create index sessions_show_id_idx on public.sessions (show_id);

alter table public.sessions enable row level security;

create policy "sessions_owner" on public.sessions
  for all using (
    exists (select 1 from public.shows where shows.id = sessions.show_id and shows.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.shows where shows.id = sessions.show_id and shows.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- markers
-- ---------------------------------------------------------------------
create table public.markers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  button_id uuid references public.buttons (id) on delete set null,
  label text not null,
  color text not null
    check (color in ('red', 'orange', 'amber', 'green', 'teal', 'blue', 'purple', 'gray')),
  tapped_at timestamptz not null,
  note text,
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index markers_session_id_idx on public.markers (session_id);
create index markers_button_id_idx on public.markers (button_id);

alter table public.markers enable row level security;

create policy "markers_owner" on public.markers
  for all using (
    exists (
      select 1 from public.sessions
      join public.shows on shows.id = sessions.show_id
      where sessions.id = markers.session_id and shows.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sessions
      join public.shows on shows.id = sessions.show_id
      where sessions.id = markers.session_id and shows.user_id = auth.uid()
    )
  );
