import type { CSSProperties } from 'react';
import type { Day2State, MapPoint } from '../lib/types';

const PREP_RESOURCE_POINTS: MapPoint[] = [
  { id: 'resource-stone', name: '工材', x: 18, y: 64, resource_type: '工材' },
  { id: 'resource-grain', name: '粮仓', x: 74, y: 67, resource_type: '粮草' },
  { id: 'resource-token', name: '铜令', x: 52, y: 35, resource_type: '铜令' }
];

const PREP_NPC_POINTS: MapPoint[] = [
  { id: 'npc-quartermaster', name: '军需官', x: 31, y: 45 },
  { id: 'npc-scout', name: '山路行脚', x: 82, y: 29 }
];

const ROUTE_PATHS = [
  { id: 'A', d: 'M54 168 C48 126 68 82 119 48 S151 30 164 18', labelX: 69, labelY: 126 },
  { id: 'B', d: 'M176 168 C170 130 171 88 178 54 S180 31 180 18', labelX: 170, labelY: 115 },
  { id: 'C', d: 'M245 168 C247 124 237 88 215 55 S193 31 190 18', labelX: 234, labelY: 118 }
] as const;

function pointStyle(point: MapPoint, index: number): CSSProperties {
  return {
    left: `${point.x ?? 18 + (index * 23) % 70}%`,
    top: `${point.y ?? 28 + (index * 19) % 52}%`
  };
}

function displayNumber(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : '—';
}

function resourceImage(point: MapPoint) {
  const text = `${point.resource_type ?? ''}${point.resource ?? ''}${point.name ?? ''}`;
  if (text.includes('粮')) return '/assets/day2/resource-liangcao.png';
  if (text.includes('铜')) return '/assets/day2/resource-tongling.png';
  if (text.includes('民')) return '/assets/day2/resource-minxin.png';
  return '/assets/day2/resource-gongcai.png';
}

function npcImage(point: MapPoint) {
  const text = `${point.name ?? ''}${point.label ?? ''}${point.id ?? ''}`;
  if (text.includes('老石匠')) return '/assets/day2/npc-laoshijiang.png';
  if (text.includes('铜鼓')) return '/assets/day2/npc-tonggushi.png';
  if (text.includes('染纹')) return '/assets/day2/npc-ranwenshi.png';
  if (text.includes('陶火')) return '/assets/day2/npc-taohuoshi.png';
  if (text.includes('粮商')) return '/assets/day2/npc-liangshang.png';
  if (text.includes('行脚') || text.includes('scout')) return '/assets/day2/npc-xingjiao.png';
  if (text.includes('史官')) return '/assets/day2/npc-shiguan.png';
  if (text.includes('说面')) return '/assets/day2/npc-shuomian.png';
  return '/assets/day2/npc-laoshijiang.png';
}

export function Day2Map({ state, fallback = false, selectedRoute }: { state: Day2State; fallback?: boolean; selectedRoute?: string }) {
  const preparing = state.phase === 'PREPARING' || state.phase === 'DAY2_PREPARING';
  const resourcePoints = state.resource_points.length ? state.resource_points : PREP_RESOURCE_POINTS;
  const npcPoints = state.npc_points.length ? state.npc_points : PREP_NPC_POINTS;
  const roundLabel = state.round ? `第 ${state.round} 轮` : '筹备期';
  const hpRatio = state.gate.max_hp && state.gate.hp != null ? Math.max(0, Math.min(100, (state.gate.hp / state.gate.max_hp) * 100)) : 0;
  const convoys = state.convoys?.length ? state.convoys : state.routes.filter((route) => typeof route.progress === 'number').map((route) => ({ id: route.id ?? route.route, route_id: route.route ?? route.id, progress: route.progress, status: route.status }));
  const latestRegistration = state.registrations[state.registrations.length - 1];
  const activeRoute = selectedRoute ?? latestRegistration?.target_id ?? state.routes[0]?.route ?? state.routes[0]?.id;
  const routesObscured = !preparing && !state.route_visibility;

  return (
    <section className="day2-map" aria-labelledby="map-title">
      <div className="map-heading">
        <div><p>战场地图</p><h2 id="map-title">{preparing ? '人、物、路' : roundLabel}</h2></div>
        <span className={`map-sync ${fallback ? 'is-offline' : ''}`}>{fallback ? '等待数据' : '战况已同步'}</span>
      </div>
      {!preparing && (
        <div className="battle-meters" aria-label={`城门 ${displayNumber(state.gate.hp)}，守方粮草 ${displayNumber(state.grain.defender_stock)}，攻方粮草 ${displayNumber(state.grain.attacker_stock)}`}>
          <div className="gate-meter"><span>城门</span><i><b style={{ width: `${hpRatio}%` }} /></i><strong>{displayNumber(state.gate.hp)}/{displayNumber(state.gate.max_hp)}</strong></div>
          <div className="grain-pair"><span>城内粮 {displayNumber(state.grain.defender_stock)}</span><span>城外粮 {displayNumber(state.grain.attacker_stock)}</span><span>封锁 {displayNumber(state.grain.blocked_min)}′</span></div>
        </div>
      )}
      <div className="map-canvas">
        <img className="map-base-image" src="/assets/ui/map.jpg" alt="" aria-hidden="true" />
        <svg className={`map-routes ${routesObscured ? 'is-obscured' : ''}`} viewBox="0 0 360 180" role="img" aria-label={`护送路线 A、B、C${activeRoute ? `，当前选择路线 ${activeRoute}` : ''}`}>
          {ROUTE_PATHS.map((route) => (
            <g key={route.id} className={`map-route map-route--${route.id.toLowerCase()} ${activeRoute === route.id ? 'is-selected' : ''}`}>
              <path d={route.d} />
              <circle cx={route.labelX} cy={route.labelY} r="9" />
              <text x={route.labelX} y={route.labelY + 3}>{route.id}</text>
            </g>
          ))}
        </svg>
        <div className="map-gate" aria-label={`主城门 ${displayNumber(state.gate.hp)}`}><span>门</span></div>
        {preparing && resourcePoints.map((point, index) => (
          <div key={point.id} className="map-point resource-point" style={pointStyle(point, index)}><img src={resourceImage(point)} alt="" aria-hidden="true" /><span>{point.name || point.resource || point.position}</span></div>
        ))}
        {preparing && npcPoints.map((point, index) => (
          <div key={point.id} className="map-point npc-point" style={pointStyle(point, index)}><img src={npcImage(point)} alt="" aria-hidden="true" /><span>{point.name || point.label || point.position}</span></div>
        ))}
        {!preparing && Object.entries(state.towers).map(([tower, owner], index) => (
          <div key={tower} className={`watchtower watchtower--${index + 1}`} aria-label={`${tower}哨站，${owner || '中立'}`}><i>{tower}</i><span>{owner || '中立'}</span></div>
        ))}
        {!preparing && state.route_visibility && convoys.map((convoy, index) => (
          <div key={convoy.id ?? `${convoy.route_id}-${index}`} className="convoy" style={{ left: `${12 + Math.max(0, Math.min(1, (convoy.progress ?? 0) > 1 ? (convoy.progress ?? 0) / 100 : (convoy.progress ?? 0))) * 72}%`, top: `${65 - index * 12}%` }} aria-label={`${convoy.route_id ?? '路线'}车队，${convoy.status ?? '行进中'}`}><i aria-hidden="true">车</i></div>
        ))}
        {routesObscured && <div className="route-shroud"><span>哨站未占领</span><p>车队位置与路线详情不可见</p></div>}
      </div>
    </section>
  );
}
