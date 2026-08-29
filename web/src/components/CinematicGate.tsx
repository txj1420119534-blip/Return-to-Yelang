import { useEffect, useRef, useState } from 'react';

export function CinematicGate({ src, kind, title, onComplete }: { src: string; kind: 'opening' | 'rupture'; title: string; onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const completeRef = useRef(onComplete);
  const [videoReady, setVideoReady] = useState(false);
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

  return (
    <section className={`cinematic cinematic--${kind}`} aria-label={title}>
      <video
        ref={videoRef}
        className={`cinematic-video ${videoReady ? 'is-ready' : ''}`}
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onCanPlay={() => setVideoReady(true)}
        onEnded={finish}
        onError={finish}
      />
    </section>
  );
}
