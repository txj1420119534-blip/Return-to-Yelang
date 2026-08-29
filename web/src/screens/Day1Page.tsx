import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InkSvg } from '../components/InkSvg';
import { MaskView } from '../components/MaskView';
import { EmptyRite, ErrRite, FragmentPips, LayerSeal, RiteButton, RiteDrawer, Slip } from '../components/ui';
import { loadSession, post } from '../lib/api';
import { tap } from '../lib/sound';
import { SCENES, type Preview } from '../lib/types';

type Tab = '今日' | '探索' | '白面' | '记录' | '我的';

type Drawer = {
  title: string;
  layer?: string;
  body: string;
  source?: string;
  audio?: string | null;
  pattern?: string;
  delta?: number;
  extra?: string;
};

const TABS: { id: Tab; mark: string }[] = [
  { id: '今日', mark: '日' },
  { id: '探索', mark: '迹' },
  { id: '白面', mark: '面' },
  { id: '记录', mark: '册' },
  { id: '我的', mark: '印' }
];

export default function Day1Page() {
  const nav = useNavigate();
  const session = loadSession();
  const [tab, setTab] = useState<Tab>('今日');
  const [data, setData] = useState<Preview | null>(null);
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [err, setErr] = useState('');
  const [scanning, setScanning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!session) return;
    const r = await post<Preview>('/api/mask-preview', { player_id: session.player_id });
    setData(r);
  }

  useEffect(() => {
    if (!session) {
      nav('/enroll');
      return;
    }
    refresh().catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  async function scan(code: string) {
    if (!session) return;
    setErr('');
    setScanning(code);
    tap('stone');
    try {
      const r = await post<{
        content_card: { title: string; body: string; layer: string; source?: string; audio_url?: string | null };
        fragment_gain: { pattern: string; delta: number };
      }>('/api/scan', { player_id: session.player_id, code });
      setDrawer({
        title: r.content_card.title,
        layer: r.content_card.layer,
        body: r.content_card.body,
        source: r.content_card.source,
        audio: r.content_card.audio_url,
        pattern: r.fragment_gain.pattern,
        delta: r.fragment_gain.delta
      });
      tap('stamp');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setScanning(null);
    }
  }

  async function craft() {
    if (!session) return;
    setBusy(true);
    setErr('');
    try {
      const r = await post<{ name: string; description: string; fragment_gain: { pattern: string; delta: number } }>(
        '/api/upload-craft',
        { player_id: session.player_id, workshop_id: 'ws-01' }
      );
      setDrawer({
        title: r.name,
        layer: '活态非遗',
        body: r.description,
        pattern: r.fragment_gain.pattern,
        delta: r.fragment_gain.delta,
        extra: '收藏入袋。Day2 可兑民心 +2。'
      });
      tap('bronze');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function motto() {
    if (!session) return;
    setBusy(true);
    setErr('');
    try {
      const r = await post<{ name: string; motto: string }>('/api/ai/mask-motto', { player_id: session.player_id });
      setDrawer({
        title: r.name,
        body: r.motto,
        extra: '面语已落墨。若谷外无钥，便用旧句托底。'
      });
      tap('ink');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!session) return null;

  return (
    <div className="page-col">
      <header className="px-5 pb-3 pt-7">
        <p className="kicker">DAY 1 · {session.name}</p>
        <h1 className="display-sm mt-2">今夜入谷</h1>
        <div className="mt-4">
          <FragmentPips fragments={data?.fragments} />
        </div>
      </header>

      <section className="page-scroll">
        {tab === '今日' && (
          <div className="space-y-3">
            <Slip kicker="主线" title="先对上石城之眼">
              扫谷口碑石，得第一枚石纹。再去工坊留下一件手作。纹不够，面就还是白的。
            </Slip>
            <Slip kicker="时辰" title="演出还在后头">
              19:20 傩戏 · 20:00 傩面舞与篝火。火纹不在白天，在夜里众人一起点。
            </Slip>
            <Slip kicker="附近悬赏" title="石羊、工坊、工材">
              找到入口两只石羊；在工坊共绘一道；工材留给明日搬。先走眼前这块碑。
            </Slip>
          </div>
        )}

        {tab === '探索' && (
          <div className="space-y-3">
            <p className="lede">相机未授时，用手点你站的地方。碑文、谷风、面纹，一层层来。</p>
            {SCENES.map((s) => (
              <button
                key={s.code}
                type="button"
                className="scene-card paper-slip"
                onClick={() => void scan(s.code)}
                aria-label={`扫描${s.title}`}
              >
                <div className={`scene-thumb scene-thumb--${s.tone} flex items-center justify-center text-[#f3ebda]`}>
                  {scanning === s.code && <i className="scan-beam" />}
                  <InkSvg src={s.icon} className="h-12 w-12" />
                </div>
                <div className="scene-body">
                  <LayerSeal layer={s.layer} />
                  <h3>{s.title}</h3>
                  <p>{s.blurb}</p>
                </div>
              </button>
            ))}
            <div className="stone-slab px-4 py-4">
              <p className="caption">工坊泥案</p>
              <p className="font-song mt-1 tracking-widest">按下泥坯，留下一件收藏</p>
              <div className="mt-3">
                <RiteButton kind="bronze" disabled={busy} onClick={() => void craft()}>
                  {busy ? '晾干中…' : '上传手作照片'}
                </RiteButton>
              </div>
            </div>
          </div>
        )}

        {tab === '白面' && (
          <div>
            <MaskView parts={data?.svg_parts} glow />
            <p className="font-song mt-4 text-center text-2xl tracking-widest">{data?.name ?? '未名面'}</p>
            <p className="mt-1 text-center text-sm leading-7 text-ink-dim">
              {data?.motto ?? '墨未干。纹够了，再请一句面语。'}
            </p>
            <div className="mt-5 space-y-2">
              <RiteButton kind="ink" sound="ink" disabled={busy} onClick={() => void motto()}>
                落一句面语
              </RiteButton>
              <RiteButton kind="ember" sound="fire" onClick={() => nav('/paint-wall')}>
                前往傩面共绘
              </RiteButton>
            </div>
          </div>
        )}

        {tab === '记录' && (
          <div className="space-y-3">
            {(data?.cards ?? []).map((c) => (
              <Slip key={c.id} kicker={c.layer} title={c.title}>
                {c.body}
              </Slip>
            ))}
            {(data?.inventory ?? []).map((i) => (
              <Slip key={i.id} kicker="收藏" title={i.name}>
                Day2：{i.day2_effect_json?.res_type} +{i.day2_effect_json?.delta}
              </Slip>
            ))}
            {!data?.cards?.length && !data?.inventory?.length && (
              <EmptyRite title="册页还白" body="先去石城走一遭。碑文会自己落下来。" />
            )}
          </div>
        )}

        {tab === '我的' && <MinePane token={session.token} name={session.name} />}

        <ErrRite message={err} />
        <div className="live" role="status" aria-live="polite">
          {drawer ? `${drawer.title} ${drawer.pattern ?? ''}`.trim() : ''}
        </div>
      </section>

      <nav className="hud-tabs" aria-label="日间页">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hud-tab ${tab === t.id ? 'is-on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => {
              tap('stone');
              setTab(t.id);
            }}
          >
            <i aria-hidden="true">{t.mark}</i>
            {t.id}
          </button>
        ))}
      </nav>

      <RiteDrawer open={!!drawer} title={drawer?.title ?? ''} onClose={() => setDrawer(null)}>
        {drawer && (
          <>
            {drawer.layer && <LayerSeal layer={drawer.layer} />}
            <p className="mt-3 text-sm leading-7">{drawer.body}</p>
            {drawer.source && <p className="caption mt-2">来源 · {drawer.source}</p>}
            {(drawer.source || drawer.audio) && (
              <div className="night-inset mt-4 px-3 py-3 text-paper">
                <p className="caption" style={{ color: '#d4a85c' }}>
                  谷风
                </p>
                <p className="mt-1 text-sm leading-6">
                  {drawer.audio ? '二十秒旧录在耳边。先听完，再走下一块碑。' : '谷风未录。先把碑文读完，纹已经在面上。'}
                </p>
                <div className="mt-3 h-1 bg-black/30">
                  <div className="h-1 w-2/3 bg-[#d4a85c]" />
                </div>
              </div>
            )}
            {drawer.pattern && (
              <div className="mt-4 flex items-center gap-4">
                <span className="stamp">{drawer.pattern}</span>
                <p className="text-sm leading-6">
                  {drawer.delta ? `面纹 ${drawer.pattern} +${drawer.delta}` : `旧纹已在面上，碑文还可再读。`}
                  {drawer.extra ? ` ${drawer.extra}` : ''}
                </p>
              </div>
            )}
            {drawer.extra && !drawer.pattern && <p className="caption mt-3">{drawer.extra}</p>}
          </>
        )}
      </RiteDrawer>
    </div>
  );
}

function MinePane({ token, name }: { token: string; name: string }) {
  const [mute, setMute] = useState(() => localStorage.getItem('yelang.mute') === '1');

  return (
    <div className="space-y-3">
      <div className="paper-slip px-4 py-5 text-center">
        <p className="caption" style={{ color: '#7a5624' }}>
          个人印
        </p>
        <div className="sigil stone-slab mt-3">
          <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden="true">
            <rect x="8" y="8" width="124" height="124" fill="none" stroke="currentColor" strokeWidth="3" />
            <text x="70" y="64" textAnchor="middle" fill="currentColor" fontSize="28" fontFamily="Noto Serif SC, serif">
              {name.slice(0, 1)}
            </text>
            <text x="70" y="92" textAnchor="middle" fill="currentColor" fontSize="9" letterSpacing="3" opacity="0.7">
              {token.slice(0, 8).toUpperCase()}
            </text>
          </svg>
        </div>
        <p className="caption mt-3">给现场核验。不是社交码。</p>
      </div>
      <Slip kicker="求助" title="迷路就找鼓边的人">
        现场工作人员在傩台侧。或回到入场页，重新叩一次门。
      </Slip>
      <RiteButton
        kind="ghost"
        sound="stone"
        onClick={() => {
          const next = !mute;
          setMute(next);
          localStorage.setItem('yelang.mute', next ? '1' : '0');
        }}
      >
        {mute ? '鼓声已歇 · 点此开声' : '鼓声在耳 · 点此静场'}
      </RiteButton>
    </div>
  );
}
