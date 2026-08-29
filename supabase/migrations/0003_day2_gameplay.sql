-- Day2 physical-play state. The API is the only writer; these rows are published
-- for read-only Realtime map updates.

create table if not exists day2_registrations (
  player_id uuid not null references players(id) on delete cascade,
  mission_type text not null check (mission_type in ('escort', 'ambush')),
  target_id char(1) not null check (target_id in ('A', 'B', 'C', 'D')),
  created_at timestamptz not null default now(),
  primary key (player_id, mission_type, target_id)
);

create table if not exists escort_runs (
  event_id uuid not null references events(id) on delete cascade,
  route_id char(1) not null check (route_id in ('A', 'B', 'C', 'D')),
  started_at timestamptz not null default now(),
  started_by uuid not null references players(id) on delete restrict,
  completed_at timestamptz,
  completed_by uuid references players(id) on delete set null,
  integrity int not null default 100 check (integrity between 0 and 100),
  broken_at timestamptz,
  primary key (event_id, route_id),
  check (not (completed_at is not null and broken_at is not null))
);

create table if not exists escort_ambushes (
  event_id uuid not null,
  route_id char(1) not null,
  player_id uuid not null references players(id) on delete cascade,
  checkpoint smallint not null check (checkpoint in (1, 2)),
  damage int not null check (damage > 0),
  occurred_at timestamptz not null default now(),
  primary key (event_id, route_id, player_id, checkpoint),
  foreign key (event_id, route_id) references escort_runs(event_id, route_id) on delete cascade
);

-- A physical QR can be used once per actor. Route start/end also have state checks
-- in the API, which make first-start and final-delivery globally single-use.
create table if not exists day2_scan_claims (
  player_id uuid not null references players(id) on delete cascade,
  code text not null check (char_length(code) <= 48),
  occurred_at timestamptz not null default now(),
  primary key (player_id, code)
);

-- Negative resource rows may never overdraw the shared faction pool.
create or replace function ledger_prevent_negative_faction_balance() returns trigger as $$
declare
  available int;
  event_of_player uuid;
begin
  if new.delta >= 0 or new.faction is null then return new; end if;
  select event_id into event_of_player from players where id = new.player_id;
  select coalesce(sum(l.delta), 0)::int into available
  from resource_ledger l
  join players p on p.id = l.player_id
  where p.event_id = event_of_player
    and l.faction = new.faction
    and l.res_type = new.res_type;
  if available + new.delta < 0 then
    raise exception 'shared faction resource balance cannot be negative';
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists ledger_nonnegative_faction_balance on resource_ledger;
create trigger ledger_nonnegative_faction_balance
  before insert on resource_ledger
  for each row execute function ledger_prevent_negative_faction_balance();

-- Browser clients use the server API, never direct tables. RLS deliberately has
-- no browser policies; the service-role API bypasses it after token validation.
alter table day2_registrations enable row level security;
alter table escort_runs enable row level security;
alter table escort_ambushes enable row level security;
alter table day2_scan_claims enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'day2_registrations'
  ) then alter publication supabase_realtime add table day2_registrations; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'escort_runs'
  ) then alter publication supabase_realtime add table escort_runs; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'escort_ambushes'
  ) then alter publication supabase_realtime add table escort_ambushes; end if;
end $$;
