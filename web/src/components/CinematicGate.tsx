import { useEffect, useRef, useState } from 'react';

export function CinematicGate({ src, kind, title, onComplete }: { src: string; kind: 'opening' | 'rupture'; title: string; onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completeRef = useRef(onComplete);
  const [videoReady, setVideoReady] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const completed = useRef(false);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      void video.play().catch(() => finish());
    }
  }, []);

  function finish() {
    if (completed.current) return;
    completed.current = true;
    completeRef.current();
  }

  function enableAudio() {
    const video = videoRef.current;
    if (!video || audioEnabled) return;
    video.muted = false;
    video.volume = 1;
    video.currentTime = 0;
    setAudioEnabled(true);
    void video.play().catch(() => {
      video.muted = true;
      setAudioEnabled(false);
    });
  }

  return (
    <section className={`cinematic cinematic--${kind}`} aria-label={title}>
      <video
        ref={videoRef}
        className={`cinematic-video ${videoReady ? 'is-ready' : ''}`}
        src={src}
        autoPlay
        muted={!audioEnabled}
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onEnded={finish}
        onError={finish}
      />
      {!audioEnabled && (
        <button
          type="button"
          className="cinematic-audio-trigger"
          aria-label="开启开场视频声音并从头播放"
          onClick={enableAudio}
        >
          <span aria-hidden="true">♪</span>
        </button>
      )}
    </section>
  );
}
