import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { post } from '../lib/api';
import { useSession } from '../lib/session';

type AdminSnapshot = {
  event: { id: string; phase: string };
  player_state_counts: Record<string, number>;
  faction_resources: Array<{ faction: string; resources: Record<string, number> }>;
  routes: Array<{ route: string; started_at: string | null; progress: number; integrity: number; status: string }>;
  reports: Array<string | { text?: string; message?: string; narration?: string; at?: string }>;
  stalled_players: Array<{ id: string; name: string; state: string; last_active: string | null }>;
};

const ADMIN_KEY_STORAGE = 'yelang.admin.key';

function reportText(report: AdminSnapshot['reports'][number]) {
  if (typeof report === 'string') return report;
  return report.text || report.message || report.narration || JSON.stringify(report);
}

export default function AdminPage() {
  const { local } = useSession();
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem(ADMIN_KEY_STORAGE) || (import.meta.env.DEV ? 'yelang-demo-admin' : ''));
  const [keyDraft, setKeyDraft] = useState('');
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const response = await post<AdminSnapshot>('/api/admin/snapshot', {}, { headers: { 'x-admin-key': adminKey } });
      setSnapshot(response);
      setUpdatedAt(new Date());
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (!local || !adminKey) return;
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [local?.token, adminKey, refresh]);

  if (!local) return <Navigate to="/enroll" replace />;

  if (!adminKey) {
    return (
      <main className="admin-page admin-auth-page">
        <form
          className="admin-auth-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const value = keyDraft.trim();
            if (!value) return;
            sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
            setAdminKey(value);
          }}
        >
          <p>重返夜郎国 · OPERATIONS</p>
          <h1>运营身份核验</h1>
          <label htmlFor="admin-key">运营口令</label>
          <input id="admin-key" type="password" autoComplete="current-password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} required />
          <button type="submit">进入只读运营屏</button>
          <span>正式环境由现场运营人员提供口令；玩家 Token 不能单独访问。</span>
        </form>
      </main>
    );
  }

  const totalPlayers = Object.values(snapshot?.player_state_counts ?? {}).reduce((sum, count) => sum + count, 0);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div><p>重返夜郎国 · OPERATIONS</p><h1>运营总览</h1><span>只读屏 · 不提供阶段推进、资源调整或重置</span></div>
        <div><span className={error ? 'is-error' : ''}>{error ? '同步中断' : '实时同步'}</span><time>{updatedAt ? updatedAt.toLocaleTimeString('zh-CN', { hour12: false }) : '—'}</time><button type="button" disabled={loading} onClick={() => void refresh()}>{loading ? '同步中…' : '立即刷新'}</button><button type="button" onClick={() => { sessionStorage.removeItem(ADMIN_KEY_STORAGE); setAdminKey(''); setKeyDraft(''); }}>更换运营口令</button></div>
      </header>
      {error && <p className="admin-error" role="alert">运营接口暂不可用：{error}。页面保留上一次成功快照，不伪造新数据。</p>}
      <section className="admin-kpis" aria-label="活动概览">
        <article><span>EVENT PHASE</span><strong>{snapshot?.event.phase ?? '—'}</strong><small>{snapshot?.event.id ?? '等待活动数据'}</small></article>
        <article><span>PLAYERS</span><strong>{snapshot ? totalPlayers : '—'}</strong><small>当前活动玩家总数</small></article>
        <article><span>STALLED</span><strong>{snapshot?.stalled_players.length ?? '—'}</strong><small>超过五分钟无活动</small></article>
        <article><span>REPORTS</span><strong>{snapshot?.reports.length ?? '—'}</strong><small>当前战报窗口</small></article>
      </section>
      <div className="admin-grid">
        <section className="admin-panel state-panel"><div className="admin-panel-title"><p>玩家状态分布</p><span>STATE DISTRIBUTION</span></div><div className="state-bars">{snapshot ? Object.entries(snapshot.player_state_counts).map(([state, count]) => <div key={state}><span>{state}</span><i><b style={{ width: `${totalPlayers ? (count / totalPlayers) * 100 : 0}%` }} /></i><strong>{count}</strong></div>) : <p>等待快照…</p>}</div></section>
        <section className="admin-panel faction-panel"><div className="admin-panel-title"><p>两阵营四资源</p><span>FACTION RESOURCES</span></div><div className="faction-table">{snapshot?.faction_resources.map((entry) => <article key={entry.faction}><h2>{entry.faction}</h2>{['工材', '粮草', '铜令', '民心'].map((resource) => <div key={resource}><span>{resource}</span><strong>{entry.resources[resource] ?? 0}</strong></div>)}</article>) ?? <p>等待快照…</p>}</div></section>
        <section className="admin-panel route-panel"><div className="admin-panel-title"><p>四路护送</p><span>CONVOY ROUTES</span></div><div className="route-table">{snapshot?.routes.map((route) => <article key={route.route}><strong>{route.route}</strong><div><span>{route.status}</span><i><b style={{ width: `${Math.max(0, Math.min(100, route.progress))}%` }} /></i><small>进度 {route.progress}% · 完整 {route.integrity}%</small></div></article>) ?? <p>等待快照…</p>}</div></section>
        <section className="admin-panel report-panel"><div className="admin-panel-title"><p>最新战报</p><span>BATTLE REPORTS</span></div><ol>{snapshot?.reports.length ? snapshot.reports.slice(-10).reverse().map((report, index) => <li key={`${index}-${reportText(report).slice(0, 12)}`}><span>{String(snapshot.reports.length - index).padStart(2, '0')}</span><p>{reportText(report)}</p></li>) : <li><p>暂无战报。</p></li>}</ol></section>
        <section className="admin-panel stalled-panel"><div className="admin-panel-title"><p>掉队玩家</p><span>NEEDS ATTENTION</span></div><div>{snapshot?.stalled_players.length ? snapshot.stalled_players.map((player) => <article key={player.id}><span>{player.name.slice(0, 1)}</span><div><strong>{player.name}</strong><p>{player.state}</p></div><time>{player.last_active ? new Date(player.last_active).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '未见活动'}</time></article>) : <p className="admin-empty">当前没有掉队玩家。</p>}</div></section>
      </div>
    </main>
  );
}
