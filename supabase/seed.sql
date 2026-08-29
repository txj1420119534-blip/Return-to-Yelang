-- ===========================================================================
-- Seed 数据（占位样板；真实内容由 C 机放 content/*.json）
-- ===========================================================================

-- 默认活动
insert into events (id, name, current_phase)
values ('00000000-0000-0000-0000-000000000001', '重返夜郎国·首演', 'DAY1_EXPLORING')
on conflict (id) do nothing;

-- 占位内容卡（C 机会覆盖）
insert into content_cards (id, title, body, source, layer, scene_id, audio_url, fragment) values
  ('scene-shicheng-01', '石城之眼', '夜郎谷石城入口的第一块古碑石，代表"证"与"石"的交会。', '示例来源', '史证', 'shicheng-01', 'assets/audio/shicheng-01.mp3', '{"pattern":"石","delta":1}'),
  ('exhibit-tongling-01','铜令展品',  '博物馆藏铜令，象征夜郎旧制。',                             '示例来源', '史证', 'tongling-01','assets/audio/tongling-01.mp3','{"pattern":"证","delta":1}'),
  ('workshop-mask-01',   '傩面工坊',  '非遗传承人现场教学面具彩绘。',                              '示例来源', '活态非遗','mask-01',    null,                        '{"pattern":"工","delta":1}')
on conflict (id) do nothing;

-- 占位悬赏
insert into quests (id, npc_id, day, type, description, reward_json, one_time_code) values
  ('11111111-1111-1111-1111-000000000001', 'npc-01', 1, '寻迹',
   '找到夜郎谷两只石羊，拍下正面照',
   '{"fragment":{"pattern":"石","delta":1},"res":[],"inventory":null}',
   'NPC-A7Q3'),
  ('11111111-1111-1111-1111-000000000002', 'npc-02', 2, '搬运',
   '把两袋工材搬到城门集结点',
   '{"fragment":null,"res":[{"res_type":"工材","delta":2}],"inventory":null}',
   'NPC-K2M1')
on conflict (id) do nothing;

-- 占位 NPC 码
insert into npc_codes (npc_id, code) values
  ('npc-01','NPC-A7Q3'),
  ('npc-02','NPC-K2M1'),
  ('npc-05','NPC-G5C9'),
  ('npc-06','NPC-S6T2'),
  ('npc-08','NPC-M8R1')
on conflict (code) do nothing;

-- 建 3 轮壳（Day2 前才用到，先占位）
insert into battle_rounds (id, event_id, round_no) values
  ('22222222-2222-2222-2222-000000000001','00000000-0000-0000-0000-000000000001',1),
  ('22222222-2222-2222-2222-000000000002','00000000-0000-0000-0000-000000000001',2),
  ('22222222-2222-2222-2222-000000000003','00000000-0000-0000-0000-000000000001',3)
on conflict (event_id, round_no) do nothing;

insert into battle_state (round_id) values
  ('22222222-2222-2222-2222-000000000001'),
  ('22222222-2222-2222-2222-000000000002'),
  ('22222222-2222-2222-2222-000000000003')
on conflict (round_id) do nothing;
