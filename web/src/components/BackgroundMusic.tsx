import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AUDIO_SETTINGS_EVENT,
  AUDIO_UNLOCK_EVENT,
  getBgmVolume,
  isBgmMuted
} from '../lib/sound';

function trackForPath(pathname: string) {
  if (pathname.startsWith('/day2') || pathname === '/battle' || pathname === '/ending') {
    return '/assets/audio/day2.mp3';
  }
  if (pathname.startsWith('/day1') || pathname === '/paint-wall') {
    return '/assets/audio/day1.mp3';
  }
  return '';
}

export function BackgroundMusic() {
  const { pathname } = useLocation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const track = trackForPath(pathname);

  const syncAndPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = getBgmVolume();
    audio.muted = isBgmMuted();
    if (!track || audio.muted || audio.volume === 0) {
      audio.pause();
      return;
    }
    void audio.play().catch(() => undefined);
  }, [track]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!track) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      return;
    }
    if (audio.getAttribute('src') !== track) {
      audio.src = track;
      audio.load();
    }
    syncAndPlay();
  }, [syncAndPlay, track]);

  useEffect(() => {
    const retry = () => syncAndPlay();
    window.addEventListener(AUDIO_SETTINGS_EVENT, retry);
    window.addEventListener(AUDIO_UNLOCK_EVENT, retry);
    document.addEventListener('pointerdown', retry, { passive: true });
    document.addEventListener('keydown', retry);
    return () => {
      window.removeEventListener(AUDIO_SETTINGS_EVENT, retry);
      window.removeEventListener(AUDIO_UNLOCK_EVENT, retry);
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
    };
  }, [syncAndPlay]);

  return <audio ref={audioRef} loop preload="auto" aria-hidden="true" />;
}
