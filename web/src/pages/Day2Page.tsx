import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InkSvg } from '../components/InkSvg';
import { ErrRite, RiteButton } from '../components/ui';
import { loadSession, post } from '../lib/api';
import { tap } from '../lib/sound';
import { DAY2_QUEST, type Preview } from '../lib/types';

const RES = [
  { key: '工材', icon: '/assets/icon/resource-gongcai.svg' },
  { key: '粮草', icon: '/assets/icon/resource-liangcao.svg' },
  { key: '铜令', icon: '/assets/icon/resource-tongling.svg' },
  { key: '民心', icon: '/assets/icon/resource-minxin.svg' }
];

export default function Day2Page() {
  const nav = useNavigate();
  const session = loadSession();
  const [info, setInfo] = useState('大面已裂。评委这一夜，站在守文盟。');
  const [res, setRes] = useState<Record<string, number>>({});
  const [carried, setCarried] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState<{ faction?: string | null; profession?: string | null }>({});

  useEffect(() => {
    if (!session) {
      nav('/enroll');
      return;
    }
    post<Preview>('/api/mask-preview', { player_id: session.player_id })
      .then((r) => {
        setWho({ faction: r.faction, profession: r.profession });
        setRes(r.resources ?? {});
        if (r.profession) setInfo(`阵营 ${r.faction ?? '守文盟'} · 职业 ${r.profession}。工材不能两头用。`);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  function pickStone(i: number) {
    if (done || carried.includes(i)) return;
    const next = [...carried, i].slice(0, 2);
    setCarried(next);
    tap('stone');
    if (next.length === 2) void finishCarry();
  }

  async function finishCarry() {
    if (!session || busy) return;
    setBusy(true);
    setErr('');
    try {
      await post('/api/quest/claim', { player_id: session.player_id, quest_id: DAY2_QUEST });
      const r = await post<{ resources: Record<string, number> }>('/api/quest/complete', {
        player_id: session.player_id,
        quest_id: DAY2_QUEST,
        one_time_code: 'NPC-K2M1'
      });
      setRes(r.resources);
      setDone(true);
      setInfo('两袋工材到了城门。同一份工材，护送车和加固城门，只能选一头。');
      tap('bronze');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('CODE_USED') || msg.includes('already') || msg.includes('用')) {
        setDone(true);
        setInfo('工材已经交过。城门边上那两袋，是你早上搬的。');
      } else {
        setErr(msg);
        setCarried([]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-pad">
      <p className="kicker">DAY 2 · 守文盟</p>
      <div className="mt-4 flex items-center gap-3">
        <InkSvg src="/assets/icon/faction-shouwen.svg" className="h-14 w-14 text-[#5d9a84]" title="守文盟" />
        <div>
          <h1 className="display-sm">筹备期</h1>
          <p className="caption mt-1">
            {who.profession ?? '职业将按主导面纹揭晓'} · {who.faction ?? '守文盟'}
          </p>
        </div>
      </div>
      <p className="lede mt-4">{info}</p>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {RES.map((r) => (
          <div key={r.key} className="stone-slab flex items-center gap-2 px-3 py-3">
            <InkSvg src={r.icon} className="h-8 w-8 text-[#d4a85c]" />
            <div>
              <p className="caption">{r.key}</p>
              <p className="font-song text-xl">{res[r.key] ?? 0}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="paper-slip mt-6 px-4 py-4">
        <p className="caption" style={{ color: '#7a5624' }}>
          搬运
        </p>
        <h2 className="font-song mt-1 tracking-widest">把两块石头搬到城门</h2>
        <p className="mt-1 text-sm leading-6 text-shenyan/70">点两块。手感要沉，像真搬过。</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              disabled={done || busy}
              className={`stone-bag stone-slab ${carried.includes(i) ? 'is-carried' : ''}`}
              onClick={() => pickStone(i)}
              aria-pressed={carried.includes(i)}
            >
              <span className="font-song text-lg">{carried.includes(i) ? '已扛' : '石'}</span>
              <span className="text-xs tracking-widest">{carried.includes(i) ? '上肩' : '待搬'}</span>
            </button>
          ))}
        </div>
      </div>
      <ErrRite message={err} />
      <div className="mt-8 space-y-2">
        <RiteButton kind="ink" sound="ink" onClick={() => nav('/battle')}>
          进入第 1 轮攻防
        </RiteButton>
      </div>
    </main>
  );
}
