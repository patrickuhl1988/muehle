-- Mühle Online Multiplayer Schema
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Spieler',
  elo_rating integer not null default 1000 check (elo_rating >= 100),
  games_played integer not null default 0,
  games_won integer not null default 0,
  avatar_config jsonb default '{}',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player1_id uuid not null references public.profiles(id) on delete cascade,
  player2_id uuid references public.profiles(id) on delete set null,
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed')),
  game_state jsonb,
  winner_id uuid references public.profiles(id),
  is_draw boolean not null default false,
  mode text not null check (mode in ('ranked', 'casual', 'friend')),
  time_control text check (time_control is null or time_control in ('bullet', 'blitz', 'rapid')),
  move_history jsonb not null default '[]',
  started_at timestamptz,
  completed_at timestamptz,
  last_seen_p1 timestamptz,
  last_seen_p2 timestamptz,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.matches is 'Enable Realtime in Supabase Dashboard (Database → Replication) for postgres_changes.';

create index if not exists matches_player1_id on public.matches(player1_id);
create index if not exists matches_player2_id on public.matches(player2_id);
create index if not exists matches_status on public.matches(status);

alter table public.matches enable row level security;

create policy "Matches viewable by participants"
  on public.matches for select using (
    auth.uid() = player1_id or auth.uid() = player2_id
  );

create policy "Authenticated users can insert matches"
  on public.matches for insert with check (auth.uid() = player1_id);

create policy "Participants can update match"
  on public.matches for update using (
    auth.uid() = player1_id or auth.uid() = player2_id
  );

-- Matchmaking queue
create table if not exists public.matchmaking_queue (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade,
  elo_rating integer not null,
  mode text not null check (mode in ('ranked', 'casual')),
  time_control text,
  queued_at timestamptz not null default now(),
  unique(player_id)
);

create index if not exists matchmaking_queue_mode on public.matchmaking_queue(mode);
create index if not exists matchmaking_queue_queued_at on public.matchmaking_queue(queued_at);

alter table public.matchmaking_queue enable row level security;

create policy "Users can manage own queue entry"
  on public.matchmaking_queue for all using (auth.uid() = player_id);

-- Trigger: update matches.updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists matches_updated_at on public.matches;
create trigger matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', 'Spieler'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
