import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CinematicGate } from '../components/CinematicGate';
import { MaskView } from '../components/MaskView';
import { ErrRite, RiteButton } from '../components/ui';
import { health, patchSession, post, saveSession, type Session } from '../lib/api';
import { useSession } from '../lib/session';

export default function EnrollPage() {
  const navigate = useNavigate();
  const { local, adopt, refresh, error: sessionError } = useSession();
  const [introDone, setIntroDone] = useState(() => sessionStorage.getItem('yelang.opening.seen') === '1');
  const [name, setName] = useState(local?.name && local.state === 'SIGNED_IN' ? local.name : '');
  const [fieldError, setFieldError] = useState('');
  const [requestError, setRequestError] = useState('');
  const [busy, setBusy] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('正在听谷门回声…');

  useEffect(() => {
    health()
      .then((result) => setServiceStatus(result.ok ? '谷门已开，白面正在等你。' : '谷门暂未开启。'))
      .catch(() => setServiceStatus('现场服务暂未连通；你仍可稍后重试领取。'));
  }, []);

  function validate() {
    const value = name.trim();
    if (!value) {
      setFieldError('请先写下玩家姓名。');
      return false;
    }
    if (value.length > 20) {
      setFieldError('姓名请控制在 20 个字以内。');
      return false;
    }
    setFieldError('');
    return true;
  }

  async function claimMask() {
    if (!validate() || busy) return;
    setBusy(true);
    setRequestError('');
    try {
      let session: Session;
      if (local?.state === 'SIGNED_IN') {
        session = { ...local, name: name.trim() };
        saveSession(session);
      } else {
        const enrolled = await post<Omit<Session, 'name'>>('/api/enroll', { name: name.trim() });
        session = { ...enrolled, name: name.trim() };
        saveSession(session);
      }
      adopt(session);
      const picked = await post<{ ok: boolean; state: string }>('/api/pick-mask-base', { player_id: session.player_id, base_id: 'base-1' });
      const readySession = { ...session, state: picked.state || 'DAY1_EXPLORING' };
      patchSession({ state: readySession.state, name: readySession.name });
      adopt(readySession);
      void refresh().catch(() => undefined);
      sessionStorage.setItem('yelang.poster.day1.pending', '1');
      navigate('/day1', { replace: true });
    } catch (caught) {
      setRequestError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!introDone) {
    return (
      <CinematicGate
        src="/assets/video/2.mp4"
        kind="opening"
        title="重返夜郎国开场影像"
        onComplete={() => {
          sessionStorage.setItem('yelang.opening.seen', '1');
          setIntroDone(true);
        }}
      />
    );
  }

  return (
    <main className="enroll-page page-pad">
      <div className="enroll-brand"><h1><img src="/assets/ui/logo.png" alt="重返夜郎国" /></h1><span>RETURN TO YELANG</span></div>
      <div className="white-mask-stage" aria-label="待领取的白色面具">
        <MaskView parts={{ base: 'base-1', eye: '', mouth: '', brow: '', aux: [] }} glow />
        <div><span>01</span><p>一张白面<br />等你留下行为</p></div>
      </div>
      <section className="enroll-copy" aria-labelledby="enroll-title">
        <p className="kicker">入谷 · 领面</p>
        <h2 id="enroll-title">先留下名字，<br />再把路走到脸上。</h2>
        <p>这张面起初没有立场。探索、手作、相遇与选择，才会让它慢慢显形。</p>
      </section>
      <form
        className="enroll-form paper-slip"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void claimMask();
        }}
      >
        <label htmlFor="player-name">玩家姓名 <span aria-hidden="true">*</span></label>
        <input
          id="player-name"
          value={name}
          autoComplete="name"
          required
          maxLength={20}
          aria-required="true"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={`enroll-status${fieldError ? ' player-name-error' : ''}`}
          placeholder="例如：贵客甲"
          onChange={(event) => {
            setName(event.target.value);
            if (fieldError) setFieldError('');
          }}
        />
        {fieldError && <p id="player-name-error" className="field-error" role="alert">{fieldError}</p>}
        <p id="enroll-status" className="enroll-status">{serviceStatus}</p>
        <RiteButton type="submit" kind="bronze" disabled={busy}>{busy ? '白面落印中…' : '领取白色面具'}</RiteButton>
      </form>
      <ErrRite message={requestError || (!local ? sessionError : '')} />
    </main>
  );
}
