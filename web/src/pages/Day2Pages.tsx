import { useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Day2Map } from '../components/Day2Map';
import { Dialog } from '../components/Dialog';
import { ScannerPanel } from '../components/ScannerPanel';
import { BackLink, EmptyPanel, ToolGrid, type ToolItem } from '../components/Workbench';
import { ErrRite } from '../components/ui';
import { post } from '../lib/api';
import { useDay2Snapshot } from '../lib/hooks';
import { useSession } from '../lib/session';
import type { Day2State } from '../lib/types';

type Faction = '守文盟' | '新火盟';

function activeFaction(value?: string | null): Faction {
  return value === '新火盟' ? '新火盟' : '守文盟';
}

function day2Tools(faction: Faction, preparing: boolean): ToolItem[] {
  const defending = faction === '守文盟';
  return [
    { to: '/day2/resources', number: '01', title: '资源', subtitle: '阵营共有 · 实时账本', glyph: '资', tone: 'bronze' },
    { to: '/day2/tasks', number: '02', title: '任务', subtitle: '找人 · 到场 · 获取资源', glyph: '任', tone: 'paper', disabled: !preparing, disabledReason: '正式攻防开始后停止领取' },
    { to: '/day2/convoy', number: '03', title: defending ? '护送任务' : '伏击任务', subtitle: defending ? '报名路线 · 护送文物车' : '部署路线 · 袭击文物车', glyph: '车', tone: 'jade', badge: '实时' },
    { to: '/day2/city', number: '04', title: defending ? '城池守护' : '攻城掠地', subtitle: defending ? '加固城门 · 守住城池' : '进攻城门 · 结算伤害', glyph: '城', tone: 'stone' },
    { to: '/day2/granary', number: '05', title: '争夺粮仓', subtitle: '内外粮草 · 影响伤害', glyph: '粮', tone: 'ember' },
    { to: '/day2/outpost', number: '06', title: '争夺哨站', subtitle: '夺取视野 · 显示路线', glyph: '哨', tone: 'blood' }
  ];
}

const RESOURCE_META = [
  { keys: ['工材', 'gong_cai'], label: '工材', image: '/assets/day2/resource-gongcai.png', note: '用于加固、护送与阵营行动。' },
  { keys: ['粮草', 'liang_cao'], label: '粮草', image: '/assets/day2/resource-liangcao.png', note: '城内外库存会改变行动效果。' },
  { keys: ['铜令', 'tong_ling'], label: '铜令', image: '/assets/day2/resource-tongling.png', note: '现场任务与特殊行动凭证。' },
  { keys: ['民心', 'min_xin'], label: '民心', image: '/assets/day2/resource-minxin.png', note: '来自协作与文化行为的共享资源。' }
];

const DAY2_TASKS = [
  { id: 'task-material', title: '搬运城门工材', brief: '把两袋工材搬到城门集结点。', npc: '铜鼓师', place: '傩台 → 城门集结点', reward: '工材 +2', image: '/assets/day2/npc-tonggushi.png' },
  { id: 'task-grain', title: '护送密封补给', brief: '把晚宴余下的密封补给送到城内粮仓。', npc: '粮商', place: '晚宴入口 → 城内粮仓', reward: '粮草 +3', image: '/assets/day2/npc-liangshang.png' },
  { id: 'task-scout', title: '侦察任意哨站', brief: '抵达任意一座哨站并完成点位核验。', npc: '山路行脚', place: '谷中岔路 / A、B、C 哨站', reward: '铜令 +2', image: '/assets/day2/npc-xingjiao.png' },
  { id: 'task-mask', title: '向队友说面', brief: '向一位队友讲清面具上最重要的一道纹。', npc: '说面人', place: '归面工坊', reward: '民心 +3', image: '/assets/day2/npc-shuomian.png' }
];

function resourceValue(resources: Record<string, number>, keys: string[]) {
  const key = keys.find((candidate) => typeof resources[candidate] === 'number');
  return key ? resources[key] : 0;
}

function phaseText(state: Day2State) {
  if (state.phase === 'PREPARING' || state.phase === 'DAY2_PREPARING') return '资源获取';
  if (state.phase.startsWith('BATTLE_R')) return `攻防第 ${state.round || state.phase.slice(-1)} 轮`;
  if (state.phase === 'ENDING') return '战局落卷';
  return '等待现场阶段';
}

export function Day2HubPage() {
  const { local, snapshot, refresh } = useSession();
  const { state, fallback, error, setState } = useDay2Snapshot();
  const faction = activeFaction(snapshot?.player.faction);
  const preparing = state.phase === 'PREPARING' || state.phase === 'DAY2_PREPARING';
  const playerId = snapshot?.player.id || snapshot?.player.player_id || local?.player_id || 'current';
  const rulesKey = `yelang.day2.rules.${playerId}`;
  const [rulesOpen, setRulesOpen] = useState(false);
  const [switchingFaction, setSwitchingFaction] = useState(false);
  const [factionMessage, setFactionMessage] = useState('');

  useEffect(() => {
    setRulesOpen(sessionStorage.getItem(rulesKey) !== 'acknowledged');
  }, [rulesKey]);

  function acknowledgeRules() {
    sessionStorage.setItem(rulesKey, 'acknowledged');
    setRulesOpen(false);
  }

  async function switchFaction() {
    const nextFaction: Faction = faction === '守文盟' ? '新火盟' : '守文盟';
    setSwitchingFaction(true);
    setFactionMessage('');
    try {
      const response = await post<{ ok: boolean; faction: Faction; day2: Day2State }>('/api/day2/demo/faction', { faction: nextFaction });
      setState(response.day2);
      await refresh();
      setFactionMessage(`演示阵营已切换为${response.faction}。`);
    } catch (caught) {
      setFactionMessage(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSwitchingFaction(false);
    }
  }

  return (
    <AppShell day={2} pageTitle={phaseText(state)} hideContext help={{ body: 'DAY2 与 DAY1 使用相同的工具台和底部菜单。战场地图收在“地图”菜单中，所有扫码和演示扫码都由同一套服务端规则结算。', steps: ['资源获取阶段完成任务并积累四类资源。', '守文盟自动执行护送与守城；新火盟自动执行伏击与攻城。', '进入战斗后关注轮次、城门、粮草与哨站视野。'] }} map={<Day2Map state={state} fallback={fallback} />}>
      <section className="day2-identity">
        <img className="faction-sigil-image" src={faction === '守文盟' ? '/assets/day2/faction-shouwen.png' : '/assets/day2/faction-xinhuo.png'} alt={`${faction}阵营纹章`} />
        <div><p>当前身份</p><h3>{snapshot?.player.faction || '阵营待揭晓'}</h3><span>{snapshot?.player.profession || '职业由主导面纹决定'}</span></div>
        <div className="demo-faction-control">
          <button type="button" disabled={switchingFaction} onClick={() => void switchFaction()}>{switchingFaction ? '切换中…' : '切换阵营'}</button>
          <small>仅 Demo 版本</small>
        </div>
      </section>
      <ErrRite message={error && fallback ? `战场数据暂不可用：${error}` : ''} />
      <p className="success-line" role="status" aria-live="polite">{factionMessage}</p>
      <div className="section-heading"><div><p>ACTIONS</p><h3>今日行动</h3></div><span>{state.round ? `R${state.round}` : '筹备'}</span></div>
      <ToolGrid items={day2Tools(faction, preparing)} />
      <Dialog open={rulesOpen} title="开城之战 · 完整玩法" eyebrow="DAY TWO" onClose={acknowledgeRules} className="day2-rules-dialog">
        <p className="rules-lede">你已进入两盟争夺。Day1 的积累会在三轮实景攻防中成为真正的资源。</p>
        <ol className="rules-steps">
          <li><strong>先取资源</strong><span>09:00–11:00 找 NPC、到指定地点完成任务，获得工材、粮草、铜令与民心。</span></li>
          <li><strong>按阵营行动</strong><span>守文盟负责护送、守城；新火盟负责伏击、攻城。今日行动会自动切换。</span></li>
          <li><strong>扫码才会结算</strong><span>正式现场扫描真实二维码；Demo 可点“模拟扫描”，两者进入同一服务端结算。</span></li>
          <li><strong>粮草改变伤害</strong><span>城内外粮草会影响攻城与伏击倍率，页面只展示服务端结果。</span></li>
          <li><strong>争哨站看路线</strong><span>占领哨站后可见护送路线 A、B、C；三轮结束后战局冻结并生成结局。</span></li>
        </ol>
        <button type="button" className="wide-link is-ember" onClick={acknowledgeRules}>我已知晓，进入战局</button>
      </Dialog>
    </AppShell>
  );
}

export function ResourcesPage() {
  const { state, fallback, error } = useDay2Snapshot();
  return (
    <AppShell day={2} pageTitle="资源 · 阵营账本" help={{ body: '这里展示阵营共享资源与当前粮草态势。数值只读，不提供前端加减按钮。' }} map={<Day2Map state={state} fallback={fallback} />}>
      <BackLink to="/day2" />
      <p className="page-lede">同一份资源不能同时用于两项行动。最后一次服务端同步决定你现在能做什么。</p>
      <ErrRite message={error && fallback ? error : ''} />
      <div className="resource-ledger">
        {RESOURCE_META.map((resource) => <article key={resource.label}><img src={resource.image} alt="" aria-hidden="true" /><div><p>{resource.label}</p><strong>{fallback ? '—' : resourceValue(state.resources, resource.keys)}</strong><small>{resource.note}</small></div></article>)}
      </div>
      <div className="grain-readout"><div><span>城内粮草</span><strong>{state.grain.defender_stock ?? '—'}</strong></div><div><span>城外粮草</span><strong>{state.grain.attacker_stock ?? '—'}</strong></div><p>粮草数量将影响伤害倍率。</p></div>
    </AppShell>
  );
}

export function TasksPage() {
  const { state, fallback } = useDay2Snapshot();
  const preparing = state.phase === 'PREPARING' || state.phase === 'DAY2_PREPARING';
  return (
    <AppShell day={2} pageTitle="任务 · 资源获取" help={{ body: '任务仅在资源获取阶段开放。找到任务发布人，抵达指定地点完成真实动作，再由现场二维码确认奖励。' }} map={<Day2Map state={state} fallback={fallback} />}>
      <BackLink to="/day2" />
      {!preparing && <EmptyPanel title="任务册已封存" body="正式攻防已经开始，资源获取任务停止领取。请返回今日行动参与战局。" />}
      <div className={`day2-task-list ${preparing ? '' : 'is-locked'}`} aria-disabled={!preparing}>
        {DAY2_TASKS.map((task) => (
          <article key={task.id} className="day2-task-card">
            <img src={task.image} alt={`${task.npc}角色形象`} />
            <div>
              <p>{task.npc} · {task.place}</p>
              <h3>{task.title}</h3>
              <span>{task.brief}</span>
              <strong>完成奖励 · {task.reward}</strong>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}

type RegistrationResponse = { ok: boolean; registration?: { mission_type?: string; target_id?: string; status?: string }; day2: Day2State };

export function ConvoyPage() {
  const { snapshot } = useSession();
  const { state, fallback, error, setState } = useDay2Snapshot();
  const faction = activeFaction(snapshot?.player.faction);
  const mode: 'escort' | 'ambush' = faction === '守文盟' ? 'escort' : 'ambush';
  const [route, setRoute] = useState('A');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [simulatingCode, setSimulatingCode] = useState('');
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function register() {
    setBusy(true);
    setActionError('');
    try {
      const response = await post<RegistrationResponse>('/api/day2/register', { mission_type: mode, target_id: route });
      if (!response.ok) throw new Error('报名未被现场账本接受。');
      setState(response.day2);
      setRegistered(true);
      setMessage(`${mode === 'escort' ? '护送' : '伏击'} · 路线 ${route} 报名已写入。接下来必须扫描现场二维码。`);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  async function scan(code: string, simulated = false) {
    setActionError('');
    if (simulated) setSimulatingCode(code);
    try {
      const response = await post<{ ok: boolean; simulated?: boolean; effect?: string | Record<string, unknown>; day2: Day2State }>('/api/day2/scan', { code, simulated });
      if (!response.ok) throw new Error('二维码未通过现场账本核验。');
      setState(response.day2);
      setMessage(`${response.simulated ? '模拟扫码' : '现场扫码'}已核验。${typeof response.effect === 'string' ? response.effect : '战况已由服务端更新。'}`);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : String(caught);
      setActionError(text);
      throw new Error(text);
    } finally {
      setSimulatingCode('');
    }
  }

  const routeRun = state.routes.find((item) => (item.route ?? item.id) === route);
  const routeMoving = routeRun?.status === 'MOVING';

  return (
    <AppShell day={2} pageTitle={mode === 'escort' ? '护送报名' : '伏击部署'} help={{ body: `${faction}当前只执行${mode === 'escort' ? '护送' : '伏击'}任务。先报名路线，再扫描现场二维码；Demo 可用模拟扫码触发同一套服务端结算。`, steps: ['选择路线 A、B 或 C 并报名。', mode === 'escort' ? '扫描起点后车队进入地图，再扫描终点完成护送。' : '在路线伏击点扫描，系统自动判断是否命中车队。', '打开地图查看路线高亮、车队与结算结果。'] }} map={<Day2Map state={state} fallback={fallback} selectedRoute={route} />}>
      <BackLink to="/day2" />
      <div className="faction-mission-banner"><strong>{faction}</strong><span>{mode === 'escort' ? '自动分配 · 护送文物车' : '自动分配 · 伏击文物车'}</span></div>
      <fieldset className="route-picker" disabled={busy}><legend>选择行动路线</legend>{['A', 'B', 'C'].map((id) => <label key={id} className={route === id ? 'is-selected' : ''}><input type="radio" name="route" value={id} checked={route === id} onChange={() => { setRoute(id); setRegistered(false); }} /><span>路线 {id}</span></label>)}</fieldset>
      {!state.route_visibility && <p className="vision-warning">哨站尚未提供路线视野；地图不会显示文物车队的详细行进线。</p>}
      <button type="button" className="wide-link is-ember" disabled={busy} onClick={() => void register()}>{busy ? '正在写入报名…' : `确认报名${mode === 'escort' ? '护送' : '伏击'}`}</button>
      {registered && <>
        <ScannerPanel title={mode === 'escort' ? '扫描护送起点 / 终点' : '扫描路线伏击点'} hint={mode === 'escort' ? '只有现场起终点二维码通过服务端核验，护送才会开始或完成。' : '抵达所选路线的现场点位后扫描，系统自动判断是否命中车队。'} onDetected={(code) => scan(code, false)} />
        <section className="demo-scan-panel" aria-labelledby="convoy-demo-title">
          <div><p>DEMO STATE</p><h3 id="convoy-demo-title">模拟扫描</h3><span>无需实体二维码，仍由服务端实施结算。</span></div>
          {mode === 'escort' ? (
            <div className="demo-scan-actions">
              <button type="button" disabled={Boolean(simulatingCode) || Boolean(routeRun)} onClick={() => void scan(`ESCORT-${route}-START`, true).catch(() => undefined)}>模拟扫描起点</button>
              <button type="button" disabled={Boolean(simulatingCode) || !routeMoving} onClick={() => void scan(`ESCORT-${route}-END`, true).catch(() => undefined)}>模拟扫描终点</button>
            </div>
          ) : (
            <div className="demo-scan-actions">
              <button type="button" disabled={Boolean(simulatingCode)} onClick={() => void scan(`AMBUSH-${route}-1`, true).catch(() => undefined)}>模拟伏击点 1</button>
              <button type="button" disabled={Boolean(simulatingCode)} onClick={() => void scan(`AMBUSH-${route}-2`, true).catch(() => undefined)}>模拟伏击点 2</button>
            </div>
          )}
        </section>
      </>}
      <ErrRite message={actionError || (fallback ? error : '')} />
      <p className="success-line" role="status" aria-live="polite">{message}</p>
    </AppShell>
  );
}

function ScanActionPage({ kind }: { kind: 'city' | 'granary' | 'outpost' }) {
  const { snapshot } = useSession();
  const faction = activeFaction(snapshot?.player.faction);
  const defending = faction === '守文盟';
  const config = {
    city: { title: defending ? '城池守护' : '攻城掠地', scanner: '扫描主城门二维码', hint: '到达城门点位后扫描。系统会按你的阵营与当前粮草自动结算守护或进攻。', help: '城门任务没有前端伤害按钮。扫描现场城门码后，服务端根据阵营、轮次、粮草与既有状态结算。' },
    granary: { title: '争夺粮仓', scanner: '扫描粮仓点位二维码', hint: '请选择你实际抵达的城内或城外粮仓点位并扫描。', help: '粮草低会改变攻城与伏击效果，但倍率不会在前端计算。扫描后只展示服务端返回的新战况。' },
    outpost: { title: '争夺哨站', scanner: '扫描哨站二维码', hint: '抵达 A、B 或 C 哨站后扫描。占领方将获得服务端授予的路线显示权。', help: '哨站控制地图视野。未获视野时，页面不会显示文物护送路线；前端也不会自行判定占领。' }
  }[kind];
  const { state, fallback, error, setState } = useDay2Snapshot();
  const [selectedTower, setSelectedTower] = useState('A');
  const [simulating, setSimulating] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function scan(code: string, simulated = false) {
    setActionError('');
    if (simulated) setSimulating(true);
    try {
      const response = await post<{ ok: boolean; simulated?: boolean; effect?: string | Record<string, unknown>; day2: Day2State }>('/api/day2/scan', { code, simulated });
      if (!response.ok) throw new Error('二维码未通过现场账本核验。');
      setState(response.day2);
      setMessage(`${response.simulated ? '模拟扫码' : '现场扫码'}已由服务端核验。${typeof response.effect === 'string' ? response.effect : '地图战况已刷新。'}`);
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : String(caught);
      setActionError(text);
      throw new Error(text);
    } finally {
      setSimulating(false);
    }
  }

  const demoCode = kind === 'city' ? 'GATE-MAIN' : kind === 'granary' ? `GRAIN-${defending ? 'IN' : 'OUT'}` : `TOWER-${selectedTower}`;

  return (
    <AppShell day={2} pageTitle={config.title} help={{ body: config.help, steps: ['从底部地图菜单确认真实点位。', '抵达现场后扫描二维码并等待服务端核验，或在 Demo 中模拟扫描。', '再次打开地图查看最新状态；不要重复提交同一行动。'] }} map={<Day2Map state={state} fallback={fallback} selectedRoute={kind === 'outpost' ? selectedTower : undefined} />}>
      <BackLink to="/day2" />
      <ScannerPanel title={config.scanner} hint={config.hint} onDetected={(code) => scan(code, false)} />
      <section className="demo-scan-panel" aria-labelledby={`${kind}-demo-title`}>
        <div><p>DEMO STATE</p><h3 id={`${kind}-demo-title`}>模拟扫描</h3><span>无需实体二维码，效果仍写入实时战况。</span></div>
        {kind === 'outpost' && <fieldset className="demo-tower-picker"><legend>选择哨站</legend>{['A', 'B', 'C'].map((tower) => <label key={tower} className={selectedTower === tower ? 'is-selected' : ''}><input type="radio" name="demo-tower" checked={selectedTower === tower} onChange={() => setSelectedTower(tower)} /><span>{tower}</span></label>)}</fieldset>}
        <button type="button" className="wide-link is-ember" disabled={simulating} onClick={() => void scan(demoCode, true).catch(() => undefined)}>{simulating ? '正在结算…' : `模拟扫描${kind === 'city' ? '主城门' : kind === 'granary' ? (defending ? '城内粮仓' : '城外粮道') : `${selectedTower} 哨站`}`}</button>
      </section>
      <ErrRite message={actionError || (fallback ? error : '')} />
      <p className="success-line" role="status" aria-live="polite">{message}</p>
      {kind === 'outpost' && !state.route_visibility && <EmptyPanel title="路线被雾遮住" body="当前哨站控制权未授予你的阵营，文物护送路线不会显示。" />}
    </AppShell>
  );
}

export function CityPage() { return <ScanActionPage kind="city" />; }
export function GranaryPage() { return <ScanActionPage kind="granary" />; }
export function OutpostPage() { return <ScanActionPage kind="outpost" />; }
