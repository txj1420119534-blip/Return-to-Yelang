import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaskView } from '../components/MaskView';
import { ErrRite, RiteButton } from '../components/ui';
import { clearSession, loadSession, post } from '../lib/api';
import { tap } from '../lib/sound';
import type { SvgParts } from '../lib/types';

type Ending = {
  tactical: { cars_delivered: number; gate_hp: number; grain_blocked_min: number };
  cultural: { code: string; title: string; text: string };
  card: { name: string; motto: string; svg_parts: SvgParts };
};

export default function EndingPage() {
  const nav = useNavigate();
  const session = loadSession();
  const [data, setData] = useState<Ending | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!session) {
      nav('/enroll');
      return;
    }
    post<Ending>('/api/ending', { player_id: session.player_id })
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="page-pad">
      <p className="kicker kicker-blood">结局</p>
      <div className="mt-4">
        <span className="chapter-seal">{data ? '终章' : '墨沉'}</span>
      </div>
      <h1 className="display mt-4">{data?.cultural.title ?? '墨还在沉…'}</h1>
      <p className="lede mt-4">{data?.cultural.text ?? '车、门、火，都在账本里对一遍。'}</p>
      {data && (
        <p className="caption mt-3">
          通车 {data.tactical.cars_delivered} · 城门 {data.tactical.gate_hp} · 粮阻 {data.tactical.grain_blocked_min} 分
        </p>
      )}
      <div className="face-card paper-slip mt-8">
        <p className="caption" style={{ color: '#8c2e1f' }}>
          个人面卡
        </p>
        {data?.card.svg_parts && <MaskView parts={data.card.svg_parts} glow className="mt-2" />}
        <p className="font-song mt-3 text-2xl tracking-widest">{data?.card.name ?? '未名面'}</p>
        <p className="mt-1 text-sm leading-7 text-shenyan/75">{data?.card.motto}</p>
      </div>
      <ErrRite message={err} />
      <div className="mt-8">
        <RiteButton
          kind="ghost"
          sound="ink"
          onClick={() => {
            tap('ink');
            clearSession();
            nav('/enroll');
          }}
        >
          再走一遍
        </RiteButton>
      </div>
    </main>
  );
}
