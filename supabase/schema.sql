-- e-Invoice Reminder — consolidated database schema
-- Tables, RLS policies, signup trigger, and storage bucket.
-- Applied to the live project via migrations; kept here for reference / re-provisioning.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  current_team_id uuid,
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table public.buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  label text not null,
  tin text,
  reg_no text,
  name text,
  email text,
  phone text,
  address text,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  merchant_name text,
  amount numeric(12,2),
  image_path text,
  purchase_date date,
  wait_days int,
  register_open_date date,
  register_deadline date,
  qr_url text,
  buyer_profile_id uuid references public.buyer_profiles(id) on delete set null,
  status text not null default 'pending',   -- pending | registered | skipped
  registered_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.team_members(user_id);
create index on public.buyer_profiles(team_id);
create index on public.receipts(team_id);
create index on public.receipts(status);

-- ---------------------------------------------------------------------------
-- RLS membership helper (SECURITY DEFINER to avoid recursion on team_members)
-- ---------------------------------------------------------------------------
create or replace function public.is_team_member(tid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1 from public.team_members
    where team_id = tid and user_id = auth.uid()
  );
$$;

-- Least privilege: not callable by anon; authenticated needs it for RLS eval.
revoke execute on function public.is_team_member(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.receipts enable row level security;

create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "teams_select_member" on public.teams for select to authenticated using (public.is_team_member(id));
create policy "teams_insert_self" on public.teams for insert to authenticated with check (created_by = auth.uid());
create policy "teams_update_member" on public.teams for update to authenticated using (public.is_team_member(id)) with check (public.is_team_member(id));

create policy "team_members_select" on public.team_members for select to authenticated using (user_id = auth.uid() or public.is_team_member(team_id));
create policy "team_members_insert_self" on public.team_members for insert to authenticated with check (user_id = auth.uid());
create policy "team_members_delete_self" on public.team_members for delete to authenticated using (user_id = auth.uid());

create policy "buyer_profiles_all" on public.buyer_profiles for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

create policy "receipts_all" on public.receipts for all to authenticated using (public.is_team_member(team_id)) with check (public.is_team_member(team_id));

-- ---------------------------------------------------------------------------
-- Auto-provision profile + personal team on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_team_id uuid;
begin
  v_name := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1));
  insert into public.profiles(id, display_name) values (new.id, v_name);
  insert into public.teams(name, created_by) values (v_name || '''s Team', new.id) returning id into v_team_id;
  insert into public.team_members(team_id, user_id, role) values (v_team_id, new.id, 'owner');
  update public.profiles set current_team_id = v_team_id where id = new.id;
  return new;
end;
$$;

-- Trigger only — not callable directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Storage: private receipts bucket, path = {team_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "receipts_storage_select" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_team_member(((storage.foldername(name))[1])::uuid));
create policy "receipts_storage_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_team_member(((storage.foldername(name))[1])::uuid));
create policy "receipts_storage_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_team_member(((storage.foldername(name))[1])::uuid));
