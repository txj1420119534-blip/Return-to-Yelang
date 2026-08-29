import { useEffect, useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { patchSession, post } from '../lib/api';
import { usePreview } from '../lib/hooks';
import { normalizeDay2, useSession } from '../lib/session';
import { isDay2State, isDay2UnlockedState, type Day2State } from '../lib/types';
import { BottomNav } from './BottomNav';
import { ChapterPoster } from './ChapterPoster';
import { DaySwitcher } from './DaySwitcher';
import { HelpDialog } from './HelpDialog';
import { MapDialog } from './MapDialog';
import { PersonalMaskDialog } from './PersonalMaskDialog';
import { ScheduleDialog } from './ScheduleDialog';
import { SettingsDialog } from './SettingsDialog';

const DAY_ONE_DEMO_TIMES = ['13:00', '17:00', '18:30', '19:20', '20:00', '20:15', '20:45'];
const DAY_TWO_DEMO_TIMES = ['09:00', '11:00', '12:00', '12:20', '12:40', '13:00'];

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function LiveClock({ day }: { day: 1 | 2 }) {
  const [now, setNow] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState('current');
  const selectId = useId();
  const demoTimes = day === 1 ? DAY_ONE_DEMO_TIMES : DAY_TWO_DEMO_TIMES;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(`yelang.demo-time.day${day}`);
    setSelectedTime(saved === 'current' || demoTimes.includes(saved ?? '') ? (saved ?? 'current') : 'current');
  }, [day]);

  const displayTime = selectedTime === 'current' ? formatClock(now) : selectedTime;
  return (
    <div className="live-clock">
      <label htmlFor={selectId}>谷中时辰</label>
      <time dateTime={selectedTime === 'current' ? now.toISOString() : selectedTime}>{displayTime}</time>
      <select
        id={selectId}
        className="clock-select"
        value={selectedTime}
        aria-label="选择演示时辰"
        onChange={(event) => {
          const value = event.target.value;
          setSelectedTime(value);
          sessionStorage.setItem(`yelang.demo-time.day${day}`, value);
        }}
      >
        <option value="current">当前时间</option>
        {demoTimes.map((time) => <option key={time} value={time}>演示 {time}</option>)}
      </select>
    </div>
  );
}

export function AppShell({
  day,
  pageTitle,
  help,
  children,
  map,
  hideContext = false,
  contentClassName = ''
}: {
  day: 1 | 2;
  pageTitle: string;
  help: { body: string; steps?: string[] };
  children: ReactNode;
  map?: ReactNode;
  hideContext?: boolean;
  contentClassName?: string;
}) {
  const navigate = useNavigate();
  const { local, snapshot, refresh, updateDay2 } = useSession();
  const { preview } = usePreview();
  const [helpOpen, setHelpOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [maskOpen, setMaskOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enteringDay2, setEnteringDay2] = useState(false);
  const [posterOpen, setPosterOpen] = useState(() => sessionStorage.getItem(`yelang.poster.day${day}.pending`) === '1');
  const [switchError, setSwitchError] = useState('');
  const day2Unlocked = Boolean(snapshot?.day2_unlocked || isDay2UnlockedState(snapshot?.player.state || local?.state));

  async function switchDay(next: 1 | 2) {
    setSwitchError('');
    if (next === 1) {
      navigate('/day1');
      return;
    }
    if (!day2Unlocked || !local || enteringDay2) return;
    const currentState = snapshot?.player.state || local.state;
    if (isDay2State(currentState)) {
      navigate('/day2');
      return;
    }
    setEnteringDay2(true);
    try {
      const result = await post<{ ok: boolean; state: string; faction?: string; profession?: string; resources?: Record<string, number>; day2?: Day2State }>('/api/day2/enter');
      patchSession({ state: result.state });
      if (result.day2) updateDay2(normalizeDay2(result.day2));
      sessionStorage.setItem('yelang.poster.day2.pending', '1');
      const refreshed = await refresh().then(() => true).catch(() => false);
      setEnteringDay2(false);
      if (!refreshed) {
        window.location.assign('/day2');
        return;
      }
      navigate('/day2');
    } catch (caught) {
      setSwitchError(caught instanceof Error ? caught.message : String(caught));
      setEnteringDay2(false);
    }
  }

  return (
    <div className={`app-shell day-${day}`}>
      <DaySwitcher currentDay={day} day2Unlocked={day2Unlocked} busy={enteringDay2} onChange={(next) => void switchDay(next)} />
      <header className="app-header">
        <img className="app-brand-logo" src="/assets/ui/logo.png" alt="重返夜郎国" />
        <div className="header-tools">
          <LiveClock day={day} />
          <button type="button" className="help-button" aria-haspopup="dialog" onClick={() => setHelpOpen(true)}><span aria-hidden="true">?</span><b>帮助</b></button>
        </div>
      </header>
      {!hideContext && (
        <div className="page-context">
          <p>DAY {day === 1 ? 'ONE' : 'TWO'}</p>
          <h2>{pageTitle}</h2>
        </div>
      )}
      <main className={`app-content ${contentClassName}`}>{children}</main>
      <BottomNav
        onTools={() => navigate(day === 1 ? '/day1' : '/day2')}
        onMap={() => setMapOpen(true)}
        onMask={() => setMaskOpen(true)}
        onSchedule={() => setScheduleOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        mapOpen={mapOpen}
        maskOpen={maskOpen}
        scheduleOpen={scheduleOpen}
        settingsOpen={settingsOpen}
      />
      <p className="shell-status" role="status" aria-live="polite">{switchError}</p>
      <HelpDialog open={helpOpen} title={`${pageTitle} · 帮助`} body={help.body} steps={help.steps} onClose={() => setHelpOpen(false)} />
      <MapDialog open={mapOpen} day={day} map={map} onClose={() => setMapOpen(false)} />
      <PersonalMaskDialog open={maskOpen} onClose={() => setMaskOpen(false)} preview={preview} playerName={local?.name || '贵客'} token={local?.token || ''} />
      <ScheduleDialog open={scheduleOpen} day={day} onClose={() => setScheduleOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {posterOpen && (
        <ChapterPoster
          day={day}
          onContinue={() => {
            sessionStorage.removeItem(`yelang.poster.day${day}.pending`);
            setPosterOpen(false);
          }}
        />
      )}
    </div>
  );
}
