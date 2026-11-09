-- כוורת הידע: חדרים חיים (Supabase). להרצה חד-פעמית ב-SQL Editor.
-- לא נוגע בטבלת activities של יומן-טק. אפשר להריץ שוב בבטחה (idempotent).
-- פרטיות: שם פרטי/כינוי בלבד. חדרים ונתוניהם נמחקים אוטומטית אחרי 24 שעות.
-- אבטחה: ה-PIN של המנהל נשמר כ-hash ולא נחשף ללקוח. כל כתיבה עוברת דרך פונקציות.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.hive_rooms (
  code        text primary key,
  pin_hash    text not null,
  groups_n    int  not null default 0 check (groups_n between 0 and 10),
  open_mode   text not null default 'teams' check (open_mode in ('teams','admin')),
  closed      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.hive_players (
  id        uuid primary key default gen_random_uuid(),
  room_code text not null references public.hive_rooms(code) on delete cascade,
  name      text not null check (char_length(name) between 1 and 20),
  team      int,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists hive_players_room on public.hive_players(room_code);

create table if not exists public.hive_opened (
  room_code text not null references public.hive_rooms(code) on delete cascade,
  cell_id   text not null,
  team      int,
  player_id uuid,
  opened_at timestamptz not null default now(),
  primary key (room_code, cell_id)          -- תא נפתח פעם אחת בלבד לכל החדר
);

create table if not exists public.hive_answers (
  id        bigint generated always as identity primary key,
  room_code text not null references public.hive_rooms(code) on delete cascade,
  cell_id   text not null,
  team      int,
  player_id uuid,
  answer    text not null check (char_length(answer) <= 200),
  created_at timestamptz not null default now()
);

-- RLS: קריאה בלבד ללקוח; pin_hash לא נחשף (select רק על עמודות מותרות).
alter table public.hive_rooms   enable row level security;
alter table public.hive_players enable row level security;
alter table public.hive_opened  enable row level security;
alter table public.hive_answers enable row level security;

drop policy if exists r_read on public.hive_rooms;
drop policy if exists p_read on public.hive_players;
drop policy if exists o_read on public.hive_opened;
drop policy if exists a_read on public.hive_answers;
create policy r_read on public.hive_rooms   for select to anon using (true);
create policy o_read on public.hive_opened  for select to anon using (true);

revoke all on public.hive_rooms, public.hive_players, public.hive_opened, public.hive_answers from anon, authenticated;
grant select (code, groups_n, open_mode, closed, created_at) on public.hive_rooms to anon;
grant select on public.hive_opened to anon;   -- שמות ותשובות נקראים רק דרך פונקציות

-- Realtime
do $$ begin
  begin alter publication supabase_realtime add table public.hive_opened;  exception when others then null; end;
  begin alter publication supabase_realtime add table public.hive_rooms;   exception when others then null; end;
end $$;

-- ===== פונקציות =====
create or replace function public._hive_pin_ok(p_code text, p_pin text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from hive_rooms where code = p_code
                 and pin_hash = extensions.crypt(p_pin, pin_hash));
$$;

-- יצירת חדר (מנהל). מנקה חדרים ישנים (>24 שעות).
create or replace function public.hive_create_room(p_pin text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare c text; i int := 0;
begin
  if p_pin is null or char_length(p_pin) < 4 then raise exception 'pin_too_short'; end if;
  delete from hive_rooms where created_at < now() - interval '24 hours';
  loop
    c := upper(substr(translate(encode(extensions.gen_random_bytes(6),'base64'),'+/=OIl01oiLQqgG9B8S5Zz2',''),1,5));
    exit when char_length(c) = 5 and not exists (select 1 from hive_rooms where code = c);
    i := i + 1; if i > 20 then raise exception 'code_gen_failed'; end if;
  end loop;
  insert into hive_rooms(code, pin_hash) values (c, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  return c;
end $$;

-- הצטרפות משתתף
create or replace function public.hive_join(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid; n text := btrim(p_name);
begin
  if n is null or char_length(n) < 1 or char_length(n) > 20 then raise exception 'bad_name'; end if;
  if not exists (select 1 from hive_rooms where code = upper(p_code) and not closed) then raise exception 'no_room'; end if;
  if (select count(*) from hive_players where room_code = upper(p_code)) >= 60 then raise exception 'room_full'; end if;
  insert into hive_players(room_code, name) values (upper(p_code), n) returning id into pid;
  return pid;
end $$;

-- מצב לטלפון: מעדכן "נראה לאחרונה" ומחזיר את כל מה שהמשתתף צריך.
drop function if exists public.hive_ping(uuid);
create or replace function public.hive_state(p_player uuid) returns json
language plpgsql security definer set search_path = public as $$
declare pl hive_players; res json;
begin
  update hive_players set last_seen = now() where id = p_player returning * into pl;
  if not found then return json_build_object('exists', false); end if;
  select json_build_object(
    'exists', true, 'name', pl.name, 'team', pl.team,
    'room', (select json_build_object('code',code,'groups_n',groups_n,'open_mode',open_mode,'closed',closed) from hive_rooms where code = pl.room_code),
    'online', (select count(*) from hive_players where room_code = pl.room_code and last_seen > now() - interval '40 seconds'),
    'opened', coalesce((select json_agg(json_build_object('cell_id',cell_id,'team',team,'opened_at',opened_at) order by opened_at) from hive_opened where room_code = pl.room_code),'[]'::json)
  ) into res;
  return res;
end $$;

-- מצב למסך המקרן (בלי שמות): חדר, כמות מחוברים, תאים שנפתחו.
create or replace function public.hive_public_state(p_code text) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'exists', exists(select 1 from hive_rooms where code = upper(p_code)),
    'room', (select json_build_object('code',code,'groups_n',groups_n,'open_mode',open_mode,'closed',closed) from hive_rooms where code = upper(p_code)),
    'online', (select count(*) from hive_players where room_code = upper(p_code) and last_seen > now() - interval '40 seconds'),
    'total', (select count(*) from hive_players where room_code = upper(p_code)),
    'opened', coalesce((select json_agg(json_build_object('cell_id',cell_id,'team',team,'opened_at',opened_at) order by opened_at) from hive_opened where room_code = upper(p_code)),'[]'::json)
  );
$$;

-- מצב למנהל (דורש PIN): כולל שמות, קבוצות ותשובות.
create or replace function public.hive_admin_state(p_code text, p_pin text) returns json
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  return json_build_object(
    'room', (select json_build_object('code',code,'groups_n',groups_n,'open_mode',open_mode,'closed',closed) from hive_rooms where code = upper(p_code)),
    'players', coalesce((select json_agg(json_build_object('id',id,'name',name,'team',team,'online', last_seen > now() - interval '40 seconds') order by joined_at) from hive_players where room_code = upper(p_code)),'[]'::json),
    'opened', coalesce((select json_agg(json_build_object('cell_id',cell_id,'team',team,'opened_at',opened_at) order by opened_at) from hive_opened where room_code = upper(p_code)),'[]'::json),
    'answers', coalesce((select json_agg(json_build_object('cell_id',cell_id,'team',team,'answer',answer,'at',created_at) order by created_at) from hive_answers where room_code = upper(p_code)),'[]'::json)
  );
end $$;

-- פתיחת תא. מצב 'teams': רק משתתף משובץ לקבוצה פותח עבור קבוצתו. מצב 'admin': דרך hive_admin_open.
create or replace function public.hive_open_cell(p_player uuid, p_cell text) returns boolean
language plpgsql security definer set search_path = public as $$
declare pl hive_players; rm hive_rooms;
begin
  select * into pl from hive_players where id = p_player;
  if not found then raise exception 'no_player'; end if;
  select * into rm from hive_rooms where code = pl.room_code;
  if rm.closed or rm.open_mode <> 'teams' then raise exception 'not_allowed'; end if;
  if rm.groups_n > 0 and pl.team is null then raise exception 'no_team'; end if;
  insert into hive_opened(room_code, cell_id, team, player_id) values (pl.room_code, p_cell, pl.team, p_player)
    on conflict do nothing;
  return found and exists (select 1 from hive_opened where room_code = pl.room_code and cell_id = p_cell and player_id = p_player);
end $$;

create or replace function public.hive_submit_answer(p_player uuid, p_cell text, p_answer text) returns void
language plpgsql security definer set search_path = public as $$
declare pl hive_players;
begin
  select * into pl from hive_players where id = p_player;
  if not found then raise exception 'no_player'; end if;
  if not exists (select 1 from hive_opened where room_code = pl.room_code and cell_id = p_cell) then raise exception 'cell_not_open'; end if;
  insert into hive_answers(room_code, cell_id, team, player_id, answer) values (pl.room_code, p_cell, pl.team, p_player, left(p_answer,200));
end $$;

-- ===== פעולות מנהל (דורשות PIN) =====
create or replace function public.hive_admin_set_groups(p_code text, p_pin text, p_n int, p_assign boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  update hive_rooms set groups_n = greatest(0, least(10, p_n)) where code = upper(p_code);
  if p_assign and p_n > 0 then   -- חלוקה אקראית שווה
    with r as (select id, (row_number() over (order by random()) - 1) % p_n + 1 as t
               from hive_players where room_code = upper(p_code))
    update hive_players p set team = r.t from r where p.id = r.id;
  elsif p_n = 0 then
    update hive_players set team = null where room_code = upper(p_code);
  end if;
end $$;

create or replace function public.hive_admin_move(p_code text, p_pin text, p_player uuid, p_team int) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  update hive_players set team = p_team where id = p_player and room_code = upper(p_code);
end $$;

create or replace function public.hive_admin_kick(p_code text, p_pin text, p_player uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  delete from hive_players where id = p_player and room_code = upper(p_code);
end $$;

create or replace function public.hive_admin_mode(p_code text, p_pin text, p_mode text, p_closed boolean) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  if p_mode not in ('teams','admin') then raise exception 'bad_mode'; end if;
  update hive_rooms set open_mode = p_mode, closed = p_closed where code = upper(p_code);
end $$;

create or replace function public.hive_admin_open(p_code text, p_pin text, p_cell text, p_team int) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  insert into hive_opened(room_code, cell_id, team) values (upper(p_code), p_cell, p_team) on conflict do nothing;
end $$;

create or replace function public.hive_admin_reset(p_code text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  delete from hive_opened  where room_code = upper(p_code);
  delete from hive_answers where room_code = upper(p_code);
end $$;

create or replace function public.hive_admin_delete_room(p_code text, p_pin text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _hive_pin_ok(upper(p_code), p_pin) then raise exception 'bad_pin'; end if;
  delete from hive_rooms where code = upper(p_code);
end $$;

-- הרשאות הרצה: רק הפונקציות הציבוריות; _hive_pin_ok פנימית.
revoke all on function public._hive_pin_ok(text,text) from public, anon, authenticated;
grant execute on function
  public.hive_create_room(text), public.hive_join(text,text), public.hive_state(uuid),
  public.hive_public_state(text), public.hive_admin_state(text,text),
  public.hive_open_cell(uuid,text), public.hive_submit_answer(uuid,text,text),
  public.hive_admin_set_groups(text,text,int,boolean), public.hive_admin_move(text,text,uuid,int),
  public.hive_admin_kick(text,text,uuid), public.hive_admin_mode(text,text,text,boolean),
  public.hive_admin_open(text,text,text,int), public.hive_admin_reset(text,text),
  public.hive_admin_delete_room(text,text)
to anon;
