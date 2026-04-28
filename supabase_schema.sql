-- ─────────────────────────────────────────────────────────
--  ChroMind — Supabase Schema
--  Colle ce SQL dans : Supabase → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────

-- Table profils joueurs
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  coins       integer not null default 0,
  best_score  integer not null default 0,
  games       integer not null default 0,
  streak      integer not null default 0,
  death_count integer not null default 0,
  owned_skins text[]  not null default array['classic'],
  equipped    text    not null default 'classic',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index sur username pour la recherche rapide
create index if not exists profiles_username_idx on public.profiles(username);

-- Row Level Security : chaque joueur ne voit/modifie que ses données
alter table public.profiles enable row level security;

create policy "Lecture profil propre" on public.profiles
  for select using (auth.uid() = id);

create policy "Mise à jour profil propre" on public.profiles
  for update using (auth.uid() = id);

create policy "Insertion profil propre" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger : met à jour updated_at automatiquement
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Trigger : crée un profil vide à l'inscription
-- (pour les users Google, le username sera généré automatiquement)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  -- Prend le username depuis les metadata ou génère depuis l'email
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'player'
  );
  -- Sanitize : enlève les caractères spéciaux
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  base_username := left(base_username, 18);
  if length(base_username) < 3 then base_username := 'player'; end if;

  final_username := base_username;

  -- Évite les doublons
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    counter := counter + 1;
    final_username := base_username || counter;
  end loop;

  insert into public.profiles (id, username)
  values (new.id, final_username);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Vue leaderboard public (top 20, anonymisée)
create or replace view public.leaderboard as
  select
    username,
    best_score,
    games,
    row_number() over (order by best_score desc) as rank
  from public.profiles
  order by best_score desc
  limit 20;

grant select on public.leaderboard to anon, authenticated;
