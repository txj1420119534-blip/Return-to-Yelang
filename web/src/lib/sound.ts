type Kind = 'stone' | 'bronze' | 'fire' | 'ink' | 'stamp';

const MUTE_KEY = 'yelang.mute';
const BGM_MUTE_KEY = 'yelang.bgm.mute';
const BGM_VOLUME_KEY = 'yelang.bgm.volume';

export const AUDIO_SETTINGS_EVENT = 'yelang:audio-settings';
export const AUDIO_UNLOCK_EVENT = 'yelang:audio-unlock';

let ctx: AudioContext | null = null;

function canPlay() {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(MUTE_KEY) === '1') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

function ac() {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function isMuted() {
  return localStorage.getItem(MUTE_KEY) === '1';
}

export function setMuted(mute: boolean) {
  localStorage.setItem(MUTE_KEY, mute ? '1' : '0');
}

export function isBgmMuted() {
  return localStorage.getItem(BGM_MUTE_KEY) === '1';
}

export function getBgmVolume() {
  const raw = localStorage.getItem(BGM_VOLUME_KEY);
  if (raw === null) return 0.35;
  const stored = Number(raw);
  return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.35;
}

function announceAudioSettings() {
  window.dispatchEvent(new Event(AUDIO_SETTINGS_EVENT));
}

export function requestAudioUnlock() {
  window.dispatchEvent(new Event(AUDIO_UNLOCK_EVENT));
}

export function setBgmMuted(mute: boolean) {
  localStorage.setItem(BGM_MUTE_KEY, mute ? '1' : '0');
  announceAudioSettings();
  if (!mute) requestAudioUnlock();
}

export function setBgmVolume(volume: number) {
  const next = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.35;
  localStorage.setItem(BGM_VOLUME_KEY, String(next));
  announceAudioSettings();
  if (next > 0) requestAudioUnlock();
}

export function tap(kind: Kind = 'stone') {
  if (!canPlay()) return;
  const c = ac();
  if (c.state === 'suspended') void c.resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);

  const table: Record<Kind, { freq: number; type: OscillatorType; dur: number; vol: number }> = {
    stone: { freq: 140, type: 'triangle', dur: 0.09, vol: 0.05 },
    bronze: { freq: 420, type: 'sine', dur: 0.18, vol: 0.045 },
    fire: { freq: 210, type: 'sawtooth', dur: 0.22, vol: 0.03 },
    ink: { freq: 280, type: 'sine', dur: 0.14, vol: 0.04 },
    stamp: { freq: 90, type: 'square', dur: 0.08, vol: 0.04 }
  };
  const p = table[kind];
  o.type = p.type;
  o.frequency.setValueAtTime(p.freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, p.freq * 0.55), t + p.dur);
  g.gain.setValueAtTime(p.vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
  o.start(t);
  o.stop(t + p.dur + 0.02);
}
