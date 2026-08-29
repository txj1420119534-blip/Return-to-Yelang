import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react';
import { Dialog } from './Dialog';

const DAY_ONE_POINTS = [
  { id: 'museum', label: '贵州省博物馆', kind: '序章', x: 18, y: 24 },
  { id: 'gate', label: '夜郎谷入口', kind: '领面', x: 25, y: 69 },
  { id: 'workshop', label: '归面工坊', kind: '体验', x: 51, y: 57 },
  { id: 'banquet', label: '晚宴席', kind: '晚宴', x: 72, y: 73 },
  { id: 'stage', label: '傩戏台', kind: '演出', x: 78, y: 30 },
  { id: 'fire', label: '篝火场', kind: '共绘', x: 52, y: 20 }
];

function DayOneMap() {
  return (
    <section className="valley-map" aria-label="夜郎谷主要活动点位示意图">
      <div className="valley-map__canvas">
        <img className="map-base-image" src="/assets/ui/map.jpg" alt="夜郎谷场地地图" />
        {DAY_ONE_POINTS.map((point) => (
          <div
            key={point.id}
            className={`valley-map__point valley-map__point--${point.id}`}
            style={{ '--point-x': `${point.x}%`, '--point-y': `${point.y}%` } as CSSProperties}
            aria-label={`${point.label}，${point.kind}点位`}
          >
            <i aria-hidden="true" />
            <span>{point.label}</span>
            <small>{point.kind}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MapDialog({ open, day, map, onClose }: { open: boolean; day: 1 | 2; map?: ReactNode; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [located, setLocated] = useState(false);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setDragging(false);
      dragRef.current = null;
      setLocationStatus('');
      setLocated(false);
    }
  }, [open]);

  function zoomBy(delta: number) {
    setZoom((current) => {
      const next = Math.max(1, Math.min(3, current + delta));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  function resetMap() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: pan.x, originY: pan.y };
    setDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
  }

  function wheelZoom(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? 0.25 : -0.25);
  }

  function locatePlayer() {
    if (!('geolocation' in navigator)) {
      setLocationStatus('当前设备不支持定位');
      return;
    }
    setLocationStatus('正在获取位置…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocated(true);
        setLocationStatus(`已取得真实坐标 · ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} · 待场地标定`);
      },
      (error) => {
        const messages: Record<number, string> = { 1: '定位权限未开启', 2: '暂时无法获取位置', 3: '定位请求超时' };
        setLocated(false);
        setLocationStatus(messages[error.code] ?? '定位失败，请稍后重试');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  return (
    <Dialog open={open} title={day === 1 ? '谷中地图' : '开城之战 · 地图'} onClose={onClose} className="map-dialog">
      <div className="map-dialog__controls" role="group" aria-label="地图控制">
        <button type="button" aria-label="放大地图" disabled={zoom >= 3} onClick={() => zoomBy(0.25)}>＋</button>
        <button type="button" aria-label="缩小地图" disabled={zoom <= 1} onClick={() => zoomBy(-0.25)}>－</button>
        <button type="button" onClick={resetMap}>重置</button>
        <button type="button" onClick={locatePlayer}>定位</button>
        <output aria-label="地图缩放比例">{Math.round(zoom * 100)}%</output>
      </div>
      <div
        className={`map-dialog__viewport ${dragging ? 'is-dragging' : ''}`}
        aria-label="地图画布，放大后可拖动查看"
        tabIndex={0}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={wheelZoom}
        onKeyDown={(event) => {
          if (zoom <= 1) return;
          const step = event.shiftKey ? 48 : 24;
          const moves: Partial<Record<string, { x: number; y: number }>> = {
            ArrowLeft: { x: step, y: 0 }, ArrowRight: { x: -step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step }
          };
          const move = moves[event.key];
          if (!move) return;
          event.preventDefault();
          setPan((current) => ({ x: current.x + move.x, y: current.y + move.y }));
        }}
      >
        <div className="map-dialog__surface" style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}>
          {day === 2 && map ? map : <DayOneMap />}
        </div>
      </div>
      {locationStatus && <p className={`map-dialog__status ${located ? 'is-located' : ''}`} role="status" aria-live="polite">{locationStatus}</p>}
    </Dialog>
  );
}
