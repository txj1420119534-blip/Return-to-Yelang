import { useEffect, useId, useRef, type ReactNode } from 'react';
import { FRAG_META, type Fragments } from '../lib/types';
import { tap } from '../lib/sound';

export function FragmentPips({ fragments, title, eyebrow }: { fragments?: Fragments | null; title?: string; eyebrow?: string }) {
  const titleId = useId();
  return (
    <section className="frag-cluster" aria-label={title ? undefined : '仁义礼智信五面纹'} aria-labelledby={title ? titleId : undefined}>
      {eyebrow && <p className="frag-cluster__eyebrow" aria-hidden="true">{eyebrow}</p>}
      {title && <h2 id={titleId} className="frag-cluster__title">{title}</h2>}
      <div className="frag-row">
        {FRAG_META.map((f) => {
          const n = fragments?.[f.key] ?? 0;
          return (
            <div key={f.key} className={`frag-pip ${n > 0 ? 'is-lit' : ''}`} title={f.hint} aria-label={`${f.cn}纹，${n > 0 ? '已点亮' : '尚未点亮'}`}>
              <img className="virtue-mark" src={`/assets/virtues-cutout/${f.image}.png`} alt="" aria-hidden="true" />
              <b>{f.cn}</b>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LayerSeal({ layer }: { layer: string }) {
  return <span className={`layer-seal layer-seal--${layer}`}>{layer}</span>;
}

export function RiteButton({
  children,
  onClick,
  disabled,
  kind = 'bronze',
  type = 'button',
  sound = 'bronze'
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: 'bronze' | 'ember' | 'ink' | 'ghost' | 'blood' | 'malachite';
  type?: 'button' | 'submit';
  sound?: 'stone' | 'bronze' | 'fire' | 'ink' | 'stamp';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`rite-btn rite-btn--${kind}`}
      onClick={() => {
        if (disabled) return;
        tap(sound);
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Slip({
  kicker,
  title,
  children,
  as: Tag = 'article'
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  as?: 'article' | 'div';
}) {
  return (
    <Tag className="paper-slip px-4 py-3.5">
      {kicker && <p className="caption" style={{ color: '#7a5624' }}>{kicker}</p>}
      <h3 className="font-song mt-0.5 text-base tracking-widest">{title}</h3>
      {children && <div className="mt-1.5 text-sm leading-7 text-shenyan/75">{children}</div>}
    </Tag>
  );
}

export function EmptyRite({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-rite night-inset">
      <p className="kicker">空</p>
      <p className="display-sm mt-3">{title}</p>
      <p>{body}</p>
    </div>
  );
}

export function ErrRite({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="err-rite" role="alert">
      {message}
    </p>
  );
}

export function RiteDrawer({
  open,
  title,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const prev = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      prev.current?.focus();
      return;
    }
    prev.current = document.activeElement as HTMLElement;
    ref.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button type="button" className="veil" aria-label="关闭" onClick={onClose} />
      <div
        ref={ref}
        className="drawer paper-slip"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        <p className="kicker" style={{ color: '#7a5624' }}>得见</p>
        <h2 id={headingId} className="display-sm mt-2">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
        <div className="mt-5">
          <RiteButton kind="ink" sound="stone" onClick={onClose}>
            收下
          </RiteButton>
        </div>
      </div>
    </>
  );
}

export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere-mist" />
      <div className="atmosphere-ridge" />
      <div className="atmosphere-embers">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
    </div>
  );
}
