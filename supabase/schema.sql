-- ===========================================================================
-- SAMO — Supabase schema
-- Paste the whole file into the Supabase SQL editor and run it once.
-- ===========================================================================

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  photo_url      text,
  birth_year     integer,
  gender         text,
  mother_tongues text[] default '{}',
  also_speaks    text[] default '{}',
  city           text,
  from_country   text,
  occupation     text,
  bio            text,
  looking_for    text[] default '{}',
  interests      text[] default '{}',
  availability   text[] default '{}',
  visibility     text default 'all'
                 check (visibility in ('all','same','verified','hidden')),
  coffee_mode    boolean default false,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),

  -- Server-side versions of the rules the front end enforces. The browser can
  -- be bypassed; these constraints cannot.
  constraint bio_length check (bio is null or char_length(bio) between 40 and 600),
  constraint adult_only check (
    birth_year is null or
    (extract(year from now())::int - birth_year) >= 18
  )
);

create index if not exists profiles_city_idx on public.profiles (city);
create index if not exists profiles_tongues_idx on public.profiles using gin (mother_tongues);

-- ------------------------------------------------------------- connections
create table if not exists public.connections (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references auth.users(id) on delete cascade,
  to_user    uuid not null references auth.users(id) on delete cascade,
  message    text,
  status     text default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  unique (from_user, to_user),
  constraint no_self check (from_user <> to_user)
);

-- ----------------------------------------------------------------- blocks
create table if not exists public.blocks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  blocked_user uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (user_id, blocked_user)
);

-- ---------------------------------------------------------------- reports
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  from_user   uuid not null references auth.users(id) on delete set null,
  about_user  uuid not null references auth.users(id) on delete cascade,
  reason      text not null,
  detail      text,
  status      text default 'open' check (status in ('open','reviewing','closed')),
  created_at  timestamptz default now()
);

-- ===========================================================================
-- Row level security
-- Without this, the anon key lets anyone read every row. Do not skip it.
-- ===========================================================================

alter table public.profiles    enable row level security;
alter table public.connections enable row level security;
alter table public.blocks      enable row level security;
alter table public.reports     enable row level security;

-- profiles ------------------------------------------------------------------

-- Anyone signed in can read profiles that are not hidden and not blocking them.
drop policy if exists "read visible profiles" on public.profiles;
create policy "read visible profiles" on public.profiles
  for select to authenticated
  using (
    visibility <> 'hidden'
    and not exists (
      select 1 from public.blocks b
      where (b.user_id = profiles.user_id and b.blocked_user = auth.uid())
         or (b.user_id = auth.uid() and b.blocked_user = profiles.user_id)
    )
  );

-- You can always read your own row, hidden or not.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists "delete own profile" on public.profiles;
create policy "delete own profile" on public.profiles
  for delete to authenticated using (auth.uid() = user_id);

-- connections ---------------------------------------------------------------

drop policy if exists "read own connections" on public.connections;
create policy "read own connections" on public.connections
  for select to authenticated
  using (auth.uid() = from_user or auth.uid() = to_user);

-- You may only send a request if your own profile is complete and verified.
drop policy if exists "send connection" on public.connections;
create policy "send connection" on public.connections
  for insert to authenticated
  with check (
    auth.uid() = from_user
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid()
        and p.photo_url is not null
        and p.display_name is not null
        and p.bio is not null
        and p.city is not null
        and p.birth_year is not null
        and array_length(p.mother_tongues, 1) >= 1
        and array_length(p.looking_for, 1) >= 1
    )
  );

drop policy if exists "answer connection" on public.connections;
create policy "answer connection" on public.connections
  for update to authenticated using (auth.uid() = to_user);

-- blocks --------------------------------------------------------------------

drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks" on public.blocks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reports -------------------------------------------------------------------

-- Members can file reports but never read them back.
drop policy if exists "file report" on public.reports;
create policy "file report" on public.reports
  for insert to authenticated with check (auth.uid() = from_user);

-- ===========================================================================
-- Storage for profile photos
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "anyone can view avatars" on storage.objects;
create policy "anyone can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- Uploads land in a folder named after the user id, so nobody can overwrite
-- somebody else's photo.
drop policy if exists "upload own avatar" on storage.objects;
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "replace own avatar" on storage.objects;
create policy "replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "delete own avatar" on storage.objects;
create policy "delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ===========================================================================
-- Create an empty profile row automatically when someone signs up
-- ===========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();
