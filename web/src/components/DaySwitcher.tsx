export function DaySwitcher({ currentDay, day2Unlocked, busy, onChange }: { currentDay: 1 | 2; day2Unlocked: boolean; busy?: boolean; onChange: (day: 1 | 2) => void }) {
  return (
    <nav className="day-switcher" aria-label="天数切换">
      <button type="button" className={currentDay === 1 ? 'is-current' : ''} aria-current={currentDay === 1 ? 'page' : undefined} onClick={() => onChange(1)}>
        <span>DAY</span><b>01</b>
      </button>
      <button
        type="button"
        className={currentDay === 2 ? 'is-current' : ''}
        aria-current={currentDay === 2 ? 'page' : undefined}
        aria-describedby={!day2Unlocked ? 'day2-lock-hint' : undefined}
        disabled={!day2Unlocked || busy}
        onClick={() => onChange(2)}
      >
        <span>DAY</span><b>{busy ? '··' : '02'}</b><i aria-hidden="true">{day2Unlocked ? '开' : '锁'}</i>
      </button>
      {!day2Unlocked && <span id="day2-lock-hint" className="sr-only">完成归面与共绘后开启第二日。</span>}
    </nav>
  );
}
