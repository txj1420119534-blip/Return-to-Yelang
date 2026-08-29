-- ===========================================================================
-- 《重返夜郎国》初始化 schema
-- 遵循圣经 §8 + CONTRACT.md §1/§2/§3
-- 铁律：resource_ledger append-only；前端不写库；所有资源变动走后端 API
-- ===========================================================================

-- 扩展
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 枚举
-- ---------------------------------------------------------------------------
do $$ begin
  create type player_state as enum (
    'SIGNED_IN','DAY1_EXPLORING','MASK_CRAFTING','FIRE_NIGHT',
    'FACTION_LOCKED','DAY2_PREPARING','BATTLE_R1','BATTLE_R2','BATTLE_R3','ENDING'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type faction as enum ('守文盟','新火盟');
exception when duplicate_object then null; end $$;

do $$ begin
  create type profession as enum ('觅迹者','百工者','说面人','护火者','领鼓人');
exception when duplicate_object then null; end $$;

do $$ begin
  create type res_type as enum ('工材','粮草','铜令','民心');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pattern_type as enum ('证','石','工','人','火');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_layer as enum ('史证','活态非遗','谷中艺术','游戏演绎');
exception when duplicate_object then null; end $$;

do $$ begin
  create type battle_target as enum ('route','gate','tower','grain','camp','event');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
create table if not exists events (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  current_phase player_state not null default 'SIGNED_IN',
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create table if not exists players (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  name          text not null,
  initial_bias  text,                         -- 选择的初始面型 base_id
  faction       faction,                      -- 阵营锁定后填
  profession    profession,                   -- 阵营锁定后填
  state         player_state not null default 'SIGNED_IN',
  token         uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_players_event on players(event_id);
create index if not exists idx_players_token on players(token);

-- ---------------------------------------------------------------------------
-- masks (一玩家一张)
-- ---------------------------------------------------------------------------
create table if not exists masks (
  player_id     uuid primary key references players(id) on delete cascade,
  fragments_json jsonb not null default
    '{"zheng":0,"shi":0,"gong":0,"ren":0,"huo":0}'::jsonb,
  style         jsonb,                        -- {base,eye,mouth,brow,aux[]}
  name          text,
  motto         text,
  image_url     text,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- inventory
-- ---------------------------------------------------------------------------
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references players(id) on delete cascade,
  source_type    text not null,               -- 'craft' | 'quest' | 'scan'
  name           text not null,
  image_url      text,
  day2_effect_json jsonb,
  consumed_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_inv_player on inventory(player_id);

-- ---------------------------------------------------------------------------
-- content_cards （知识卡；C 机 seed 内容）
-- ---------------------------------------------------------------------------
create table if not exists content_cards (
  id         text primary key,                -- 用可读 id：'scene-shicheng-01'
  title      text not null,
  body       text not null,
  source     text,
  layer      content_layer not null,
  scene_id   text,                            -- 关联的场景/展品/工坊 id
  audio_url  text,
  fragment   jsonb                             -- {pattern:'石',delta:1}
);

-- ---------------------------------------------------------------------------
-- quests
-- ---------------------------------------------------------------------------
create table if not exists quests (
  id             uuid primary key default gen_random_uuid(),
  npc_id         text,
  day            int not null check (day in (1,2)),
  type           text,
  description    text not null,
  reward_json    jsonb not null,
  one_time_code  text
);

create table if not exists quest_progress (
  player_id     uuid not null references players(id) on delete cascade,
  quest_id      uuid not null references quests(id) on delete cascade,
  state         text not null default 'CLAIMED', -- CLAIMED | DONE
  evidence_url  text,
  updated_at    timestamptz not null default now(),
  primary key (player_id, quest_id)
);

-- ---------------------------------------------------------------------------
-- resource_ledger (append-only)
-- ---------------------------------------------------------------------------
create table if not exists resource_ledger (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references players(id) on delete cascade,
  faction     faction,                         -- 未锁定时 null
  res_type    res_type not null,
  delta       int not null check (delta <> 0),
  source      text not null,                   -- 'quest:xxx' | 'battle:xxx' | 'bonus'
  occurred_at timestamptz not null default now()
);
create index if not exists idx_ledger_player  on resource_ledger(player_id);
create index if not exists idx_ledger_faction on resource_ledger(faction);
create index if not exists idx_ledger_time    on resource_ledger(occurred_at);

-- 禁止 update / delete（append-only）
create or replace function ledger_immutable() returns trigger as $$
begin
  raise exception 'resource_ledger is append-only';
end $$ language plpgsql;

drop trigger if exists ledger_no_update on resource_ledger;
create trigger ledger_no_update before update or delete on resource_ledger
  for each row execute function ledger_immutable();

-- ---------------------------------------------------------------------------
-- battle_rounds / actions / state
-- ---------------------------------------------------------------------------
create table if not exists battle_rounds (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references events(id) on delete cascade,
  round_no       int not null check (round_no in (1,2,3)),
  winner_faction faction,
  started_at     timestamptz,
  ended_at       timestamptz,
  unique (event_id, round_no)
);

create table if not exists battle_actions (
  id           uuid primary key default gen_random_uuid(),
  round_id     uuid not null references battle_rounds(id) on delete cascade,
  player_id    uuid references players(id) on delete set null,   -- bot 时为 null
  is_bot       boolean not null default false,
  target_type  battle_target not null,
  target_id    text not null,
  cost_json    jsonb not null default '{}'::jsonb,
  effect_json  jsonb not null default '{}'::jsonb,
  narration    text,
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_actions_round on battle_actions(round_id);

create table if not exists battle_state (
  round_id           uuid primary key references battle_rounds(id) on delete cascade,
  gate_hp            int not null default 100,
  grain_blocked_min  int not null default 0,
  tower_a            faction,
  tower_b            faction,
  tower_c            faction,
  attacker_camps     int not null default 4,       -- 攻方营地数
  cars_delivered     int not null default 0,       -- 守方本轮通车数
  cars_broken        int not null default 0,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- analytics_events
-- ---------------------------------------------------------------------------
create table if not exists analytics_events (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid references players(id) on delete set null,
  event_type   text not null,
  payload_json jsonb,
  occurred_at  timestamptz not null default now()
);
create index if not exists idx_analytics_player on analytics_events(player_id);
create index if not exists idx_analytics_time   on analytics_events(occurred_at);

-- ---------------------------------------------------------------------------
-- npc_codes （NPC 一次性核销码）
-- ---------------------------------------------------------------------------
create table if not exists npc_codes (
  id        uuid primary key default gen_random_uuid(),
  npc_id    text not null,
  code      text not null unique,
  used_by   uuid references players(id) on delete set null,
  used_at   timestamptz
);
