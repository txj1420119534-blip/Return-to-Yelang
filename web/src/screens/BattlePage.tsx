import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BattleMap, HpBar } from '../components/BattleMap';
import { ErrRite, RiteButton } from '../components/ui';
import { loadSession, post } from '../lib/api';
import { tap } from '../lib/sound';
import { ROUNDS, type BattleState } from '../lib/types';

export default function BattlePage() {
  const nav = useNavigate();
  const session = loadSession();
  const [round, setRound] = useState(1);
  const [state, setState] = useState<BattleState>({
    gate_hp: 100,
    grain_blocked_min: 0,
    tower_a: '守文盟',
    tower_b: '守文盟',
    tower_c: null,
    cars_delivered: 0,
    cars_broken: 0,
    attacker_camps: 4
  });
  const [log, setLog] = useState<string[]>(['鼓响。新火盟由脚本出招，只写在战报里。']);
  const [hurt, setHurt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [chose, setChose] = useState(false);

  async function act(body: Record<string, unknown>, note?: string) {
    if (!session) return;
    setBusy(true);
    setErr('');
    const prevHp = state.gate_hp;
    try {
      const r = await post<{ new_state: BattleState }>('/api/battle/action', {
        player_id: session.player_id,
        round_id: ROUNDS[round - 1],
        ...body
      });
      setState(r.new_state);
      if (r.new_state.gate_hp < prevHp) {
        setHurt(true);
        window.setTimeout(() => setHurt(false), 500);
      }
      const bot = await post<{ action: { narration: string }; new_state: BattleState }>('/api/battle/bot-tick', {
        round_id: ROUNDS[round - 1]
      });
      setState(bot.new_state);
      const n = await post<{ text: string }>('/api/ai/narrate', { round_id: ROUNDS[round - 1] });
      setLog((prev) => [...prev, note, n.text, `新火盟 · ${bot.action.narration}`].filter(Boolean) as string[]);
      tap('stone');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-pad">
      <p className="kicker kicker-blood">战场 · 第 {round} 轮</p>
      <h1 className="display-sm mt-2">守文盟还在门里</h1>
      <div className="mt-4 space-y-3">
        <HpBar label="城门" value={state.gate_hp} hurt={hurt} />
        <p className="caption">
          通车 {state.cars_delivered} · 破车 {state.cars_broken} · 粮阻 {state.grain_blocked_min} 分 · 甲塔{' '}
          {state.tower_a ?? '中立'}
        </p>
      </div>
      <div className="mt-4">
        <BattleMap state={state} />
      </div>
      <div className="war-log night-inset mt-4">
        {log.map((l, i) => (
          <p key={`${i}-${l.slice(0, 8)}`}>· {l}</p>
        ))}
      </div>
      <ErrRite message={err} />

      {round === 1 && (
        <div className="mt-4 space-y-2">
          <RiteButton
            kind="malachite"
            disabled={busy}
            onClick={() => void act({ target_type: 'route', target_id: 'A', cost: { gong_cai: 1 } }, '护送队走路线 A。')}
          >
            护送路线 A
          </RiteButton>
          <RiteButton
            kind="ink"
            disabled={busy}
            onClick={() => void act({ target_type: 'gate', target_id: 'main', cost: { gong_cai: 1 } }, '工材压上城门。')}
          >
            加固城门
          </RiteButton>
          <RiteButton kind="ghost" sound="ink" disabled={busy} onClick={() => setRound(2)}>
            进入第 2 轮
          </RiteButton>
        </div>
      )}

      {round === 2 && (
        <div className="mt-4 space-y-2">
          <div className="paper-slip px-4 py-4">
            <p className="caption" style={{ color: '#8c2e1f' }}>
              突发事件
            </p>
            <h2 className="font-song mt-1 text-lg tracking-widest">工坊失火</h2>
            <p className="mt-2 text-sm leading-7 text-shenyan/75">
              救文物，城门一时无人加固。守城墙，工坊的火只能先看着。这是代价时刻。
            </p>
          </div>
          <RiteButton
            kind="blood"
            sound="fire"
            disabled={busy}
            onClick={() => {
              setChose(true);
              void act({ target_type: 'event', target_id: 'save' }, '选择：救文物。');
            }}
          >
            救文物
          </RiteButton>
          <RiteButton
            kind="ink"
            disabled={busy}
            onClick={() => {
              setChose(true);
              void act({ target_type: 'event', target_id: 'defend' }, '选择：守城墙。');
            }}
          >
            守城墙
          </RiteButton>
          {chose && <p className="caption">选择已写入账本。城门与通车会立刻变。</p>}
          <RiteButton kind="ghost" sound="ink" disabled={busy} onClick={() => setRound(3)}>
            进入第 3 轮
          </RiteButton>
        </div>
      )}

      {round === 3 && (
        <div className="mt-4 space-y-2">
          <p className="lede">物资只够做一件事。鼓停之前，把最后一笔压下去。</p>
          <RiteButton
            kind="malachite"
            disabled={busy}
            onClick={() => void act({ target_type: 'route', target_id: 'C', cost: { gong_cai: 1 } }, '最后一辆车走路线 C。')}
          >
            最后一辆车 · 路线 C
          </RiteButton>
          <RiteButton
            kind="ink"
            disabled={busy}
            onClick={() => void act({ target_type: 'gate', target_id: 'main', cost: { gong_cai: 1 } }, '最后的工材压上城门。')}
          >
            把最后的工材压上城门
          </RiteButton>
          <RiteButton kind="ember" sound="fire" onClick={() => nav('/ending')}>
            看结局
          </RiteButton>
        </div>
      )}
    </main>
  );
}
