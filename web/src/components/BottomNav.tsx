type BottomNavProps = {
  onTools: () => void;
  onMap: () => void;
  onMask: () => void;
  onSchedule: () => void;
  onSettings: () => void;
  toolActive?: boolean;
  mapOpen?: boolean;
  maskOpen?: boolean;
  scheduleOpen?: boolean;
  settingsOpen?: boolean;
};

export function BottomNav({
  onTools,
  onMap,
  onMask,
  onSchedule,
  onSettings,
  toolActive = true,
  mapOpen = false,
  maskOpen = false,
  scheduleOpen = false,
  settingsOpen = false
}: BottomNavProps) {
  const dialogOpen = mapOpen || maskOpen || scheduleOpen || settingsOpen;
  const toolsCurrent = toolActive && !dialogOpen;
  return (
    <nav className="bottom-nav" aria-label="主要菜单">
      <button
        type="button"
        className={toolsCurrent ? 'is-active' : ''}
        aria-current={toolsCurrent ? 'page' : undefined}
        aria-label="返回功能工具台"
        onClick={onTools}
      >
        <span aria-hidden="true">器</span>
        <b>工具</b>
      </button>
      <button type="button" className={mapOpen ? 'is-active' : ''} aria-current={mapOpen ? 'page' : undefined} aria-label="打开地图" aria-haspopup="dialog" aria-expanded={mapOpen} onClick={onMap}>
        <span aria-hidden="true">图</span>
        <b>地图</b>
      </button>
      <button type="button" className={`mask-nav-button ${maskOpen ? 'is-active' : ''}`} aria-current={maskOpen ? 'page' : undefined} aria-label="打开个人傩面" aria-haspopup="dialog" aria-expanded={maskOpen} onClick={onMask}>
        <span aria-hidden="true">面</span>
        <b>傩面</b>
      </button>
      <button type="button" className={scheduleOpen ? 'is-active' : ''} aria-current={scheduleOpen ? 'page' : undefined} aria-label="打开当日日程" aria-haspopup="dialog" aria-expanded={scheduleOpen} onClick={onSchedule}>
        <span aria-hidden="true">程</span>
        <b>日程</b>
      </button>
      <button type="button" className={settingsOpen ? 'is-active' : ''} aria-current={settingsOpen ? 'page' : undefined} aria-label="打开设置" aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={onSettings}>
        <span aria-hidden="true">调</span>
        <b>设置</b>
      </button>
    </nav>
  );
}
