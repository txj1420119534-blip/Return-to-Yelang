import { useEffect, useRef } from 'react';

export function ChapterPoster({ day, onContinue }: { day: 1 | 2; onContinue: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <section
      aria-label={`DAY ${day === 1 ? 'ONE' : 'TWO'} 章节海报`}
      style={{ position: 'absolute', zIndex: 240, inset: 0, display: 'grid', background: '#020405' }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={`收起 DAY ${day === 1 ? 'ONE' : 'TWO'} 海报，进入当天行程`}
        onClick={onContinue}
        style={{ width: '100%', height: '100%', padding: 0, border: 0, overflow: 'hidden', background: '#020405', cursor: 'pointer' }}
      >
        <img
          src={`/assets/ui/Day${day}.png`}
          alt={`DAY ${day === 1 ? 'ONE' : 'TWO'} 章节海报`}
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </button>
    </section>
  );
}
