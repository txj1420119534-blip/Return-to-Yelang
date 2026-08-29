import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Dialog } from '../components/Dialog';
import { MaskView } from '../components/MaskView';
import { BackLink } from '../components/Workbench';
import { ErrRite, RiteButton } from '../components/ui';
import { patchSession, post } from '../lib/api';
import { usePreview } from '../lib/hooks';
import { useSession } from '../lib/session';
import { VIRTUE_OPTIONS, type Day2State, type VirtueId } from '../lib/types';

function storedVirtue(): VirtueId | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem('yelang.paint.virtue');
  return VIRTUE_OPTIONS.some((virtue) => virtue.id === value) ? value as VirtueId : null;
}

export default function PaintWallPage() {
  const navigate = useNavigate();
  const { local, snapshot, adopt, refresh } = useSession();
  const { preview, refresh: refreshPreview } = usePreview();
  const alreadyPainted = Boolean(snapshot?.day2_unlocked || snapshot?.player.state === 'FIRE_NIGHT' || snapshot?.player.state === 'FACTION_LOCKED');
  const [selected, setSelected] = useState<VirtueId | null>(() => storedVirtue());
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [painted, setPainted] = useState(alreadyPainted);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [enteringDay2, setEnteringDay2] = useState(false);
  const [showDay2Prompt, setShowDay2Prompt] = useState(false);
  const [message, setMessage] = useState(alreadyPainted ? '你的一道纹已经留在共面上。' : '选择一德与落笔位置，每位玩家只写一次。');
  const [error, setError] = useState('');
  const litCells = useMemo(() => Math.max(painted ? 1 : 0, Math.min(20, total)), [painted, total]);
  const selectedVirtue = VIRTUE_OPTIONS.find((virtue) => virtue.id === selected) ?? null;

  useEffect(() => {
    if (!alreadyPainted) return;
    setPainted(true);
    setMessage('你的一道纹已经留在共面上。');
  }, [alreadyPainted]);

  useEffect(() => {
    if (!preview.selected_virtue) return;
    setSelected(preview.selected_virtue);
  }, [preview.selected_virtue]);

  function selectVirtue(virtue: VirtueId) {
    setSelected(virtue);
    sessionStorage.setItem('yelang.paint.virtue', virtue);
  }

  async function paint() {
    if (!local || busy || painted) return;
    if (!selectedVirtue || selectedCell === null) {
      setError('请先选择仁义礼智信之一，并在共面上选定落笔位置。');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; wall_total: number; state: string; selected_virtue?: VirtueId | null }>('/api/paint-wall', { pattern_id: selectedVirtue.patternId });
      setPainted(true);
      setTotal(result.wall_total ?? 1);
      if (result.selected_virtue) setSelected(result.selected_virtue);
      setMessage('落笔已写入共面，DAY2 现已开启。');
      patchSession({ state: result.state || 'FIRE_NIGHT' });
      await Promise.allSettled([refresh(), refreshPreview()]);
      setShowDay2Prompt(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function enterDay2() {
    if (enteringDay2) return;
    setEnteringDay2(true);
    setError('');
    try {
      const result = await post<{ ok: boolean; state: string; day2?: Day2State }>('/api/day2/enter');
      const nextState = result.state || 'DAY2_PREPARING';
      patchSession({ state: nextState });
      if (local) adopt({ ...local, state: nextState });
      sessionStorage.setItem('yelang.poster.day2.pending', '1');
      await refresh().catch(() => undefined);
      navigate('/day2');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setEnteringDay2(false);
    }
  }

  return (
    <AppShell day={1} pageTitle="傩面共绘 · 唯一一笔" help={{ body: '每位玩家只能提交一道纹。先从仁、义、礼、智、信中选择，再确认落笔。', steps: ['选择最像你今晚行为的一德。', '观察共面格子的预览反馈。', '确认落笔后，顶部 DAY2 将在流程允许时开启。'] }}>
      <BackLink to="/day1/mask">返回归面</BackLink>
      <section className="wall-stage" aria-labelledby="wall-grid-title">
        <div className="wall-stage__heading"><p>CO-CREATION GRID</p><h2 id="wall-grid-title">选择你要落笔的一格</h2></div>
        <MaskView parts={null} virtue={selected} virtueMode glow className="wall-mask-preview" />
        <div className="wall-mask">
          {Array.from({ length: 20 }, (_, index) => {
            const ownMark = index === selectedCell;
            const confirmed = index < litCells || (painted && ownMark);
            const preview = !painted && ownMark;
            return (
              <button
                key={index}
                type="button"
                className={`${confirmed ? 'is-lit' : ''} ${preview ? 'is-preview' : ''}`}
                aria-label={`共面第 ${index + 1} 格${ownMark ? `，已选择${selectedVirtue ? `落${selectedVirtue.name}纹` : '为落笔位置'}` : ''}`}
                aria-pressed={ownMark}
                disabled={painted || busy}
                onClick={() => setSelectedCell(index)}
              >
                {ownMark && selectedVirtue && <><img className="virtue-mark" src={`/assets/virtues-cutout/${selectedVirtue.id}.png`} alt="" aria-hidden="true" /><span>{selectedVirtue.name}</span></>}
              </button>
            );
          })}
        </div>
      </section>
      <fieldset className="stroke-picker virtue-picker" disabled={painted || busy}>
        <legend>选择仁义礼智信之一</legend>
        {VIRTUE_OPTIONS.map((virtue) => (
          <label key={virtue.id} className={selected === virtue.id ? 'is-selected' : ''}>
            <input type="radio" name="virtue" value={virtue.id} checked={selected === virtue.id} onChange={() => selectVirtue(virtue.id)} />
            <img className="virtue-mark" src={`/assets/virtues-cutout/${virtue.id}.png`} alt="" aria-hidden="true" />
            <strong>{virtue.name}</strong>
          </label>
        ))}
      </fieldset>
      <ErrRite message={error} />
      <p className="success-line" role="status" aria-live="polite">{message}</p>
      <RiteButton kind="ember" disabled={painted || busy || !selectedVirtue || selectedCell === null} onClick={() => void paint()}>{painted ? '这一笔已写入' : busy ? '正在落笔…' : '确认落下唯一一笔'}</RiteButton>
      <Dialog open={showDay2Prompt} title="DAY2 已开启" eyebrow="共面落成" onClose={() => setShowDay2Prompt(false)} className="day2-entry-dialog">
        <p className="result-body">你的唯一一笔已经留在共面上。现在进入 DAY2，选择阵营并参与资源与城战。</p>
        <ErrRite message={error} />
        <RiteButton kind="ember" disabled={enteringDay2} onClick={() => void enterDay2()}>{enteringDay2 ? '正在进入 DAY2…' : '进入 DAY2'}</RiteButton>
      </Dialog>
    </AppShell>
  );
}
