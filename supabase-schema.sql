-- Merkaztech activity log — run this once in Supabase → SQL Editor → New query → Run.
-- Creates the activities table, row-level security policies, and enables realtime updates.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time text,
  end_time text,
  domain text,
  school text,
  track_name text,
  track_code text,
  percent_group text,
  class_name text,
  students_planned integer,
  students_actual integer,
  teacher text,
  space1_name text,
  space1_number text,
  space2_name text,
  space2_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text
);

alter table public.activities enable row level security;

-- Anyone with the site link can read the log (needed for the public live view page).
create policy "Public can read activities"
  on public.activities for select
  to anon, authenticated
  using (true);

-- Only signed-in staff (created in Authentication → Users) can add, edit or delete activities.
create policy "Authenticated staff can insert activities"
  on public.activities for insert
  to authenticated
  with check (true);

create policy "Authenticated staff can update activities"
  on public.activities for update
  to authenticated
  using (true);

create policy "Authenticated staff can delete activities"
  on public.activities for delete
  to authenticated
  using (true);

-- Lets both pages receive live updates the moment a row is inserted/edited/deleted.
alter publication supabase_realtime add table public.activities;
