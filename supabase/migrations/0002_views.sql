-- ===========================================================================
-- 聚合视图（前端订阅）
-- ===========================================================================

-- 每阵营 4 类物资余额
create or replace view v_faction_resources as
select
  p.event_id,
  l.faction,
  l.res_type,
  coalesce(sum(l.delta), 0)::int as balance
from resource_ledger l
join players p on p.id = l.player_id
where l.faction is not null
group by p.event_id, l.faction, l.res_type;

-- 玩家面纹碎片聚合（从 masks.fragments_json 展开）
create or replace view v_player_mask as
select
  m.player_id,
  coalesce((m.fragments_json->>'zheng')::int, 0) as zheng,
  coalesce((m.fragments_json->>'shi')::int,   0) as shi,
  coalesce((m.fragments_json->>'gong')::int,  0) as gong,
  coalesce((m.fragments_json->>'ren')::int,   0) as ren,
  coalesce((m.fragments_json->>'huo')::int,   0) as huo,
  ( coalesce((m.fragments_json->>'zheng')::int,0)
  + coalesce((m.fragments_json->>'shi')::int,0)
  + coalesce((m.fragments_json->>'gong')::int,0)
  + coalesce((m.fragments_json->>'ren')::int,0)
  + coalesce((m.fragments_json->>'huo')::int,0) )::int as total,
  m.name,
  m.motto,
  m.style
from masks m;

-- 每场活动阵营人数分布（运营屏用）
create or replace view v_faction_headcount as
select event_id, faction, count(*)::int as n
from players
where faction is not null
group by event_id, faction;

-- 掉队玩家：5 分钟无 analytics 写入
create or replace view v_stalled_players as
select p.id as player_id, p.name, p.state,
       max(a.occurred_at) as last_active
from players p
left join analytics_events a on a.player_id = p.id
group by p.id, p.name, p.state
having max(a.occurred_at) is null
    or max(a.occurred_at) < now() - interval '5 minutes';
