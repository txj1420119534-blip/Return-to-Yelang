import { useEffect, useState } from 'react';
import { clearSession } from '../lib/api';
import { getBgmVolume, isBgmMuted, isMuted, setBgmMuted, setBgmVolume, setMuted } from '../lib/sound';
import { Dialog } from './Dialog';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [muted, setMutedState] = useState(() => isMuted());
  const [bgmMuted, setBgmMutedState] = useState(() => isBgmMuted());
  const [bgmVolume, setBgmVolumeState] = useState(() => getBgmVolume());

  useEffect(() => {
    if (!open) return;
    setMutedState(isMuted());
    setBgmMutedState(isBgmMuted());
    setBgmVolumeState(getBgmVolume());
  }, [open]);

  return (
    <Dialog open={open} title="行囊设置" eyebrow="设置" onClose={onClose}>
      <div className="setting-row">
        <div><strong>环境音效</strong><p>按钮鼓点与落印反馈。</p></div>
        <button
          type="button"
          className={`toggle-button ${muted ? '' : 'is-on'}`}
          aria-pressed={!muted}
          onClick={() => {
            const next = !muted;
            setMuted(next);
            setMutedState(next);
          }}
        >
          {muted ? '已静音' : '已开启'}
        </button>
      </div>
      <div className="setting-row" style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(42, 46, 51, .16)' }}>
        <div><strong>背景音乐</strong><p>DAY 01 与 DAY 02 的循环氛围音乐。</p></div>
        <button
          type="button"
          className={`toggle-button ${bgmMuted ? '' : 'is-on'}`}
          aria-pressed={!bgmMuted}
          onClick={() => {
            const next = !bgmMuted;
            setBgmMuted(next);
            setBgmMutedState(next);
          }}
        >
          {bgmMuted ? '已静音' : '已开启'}
        </button>
      </div>
      <div style={{ marginTop: 12 }}>
        <label htmlFor="bgm-volume" style={{ display: 'flex', justifyContent: 'space-between', color: '#665e53', fontSize: 11 }}>
          <span>音乐音量</span>
          <span>{Math.round(bgmVolume * 100)}%</span>
        </label>
        <input
          id="bgm-volume"
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(bgmVolume * 100)}
          aria-label="背景音乐音量"
          onChange={(event) => {
            const next = Number(event.target.value) / 100;
            setBgmVolume(next);
            setBgmVolumeState(next);
          }}
          style={{ width: '100%', minHeight: 36, accentColor: '#3a6b5c' }}
        />
      </div>
      <div className="setting-note">
        <strong>迷路或掉队？</strong>
        <p>请前往傩台侧的现场服务点。关闭页面不会清除游戏进度。</p>
      </div>
      <button
        type="button"
        className="text-danger-button"
        onClick={() => {
          clearSession();
          window.location.assign('/enroll');
        }}
      >
        退出本次行程
      </button>
    </Dialog>
  );
}
