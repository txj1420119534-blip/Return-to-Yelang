import { Link } from 'react-router-dom';
import { LayerSeal } from './ui';

export type ToolItem = {
  to: string;
  number: string;
  title: string;
  subtitle: string;
  glyph: string;
  tone?: 'stone' | 'jade' | 'bronze' | 'ember' | 'paper' | 'blood';
  badge?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function ToolGrid({ items }: { items: ToolItem[] }) {
  return (
    <nav className="tool-grid" aria-label="功能入口">
      {items.map((item) => (
        item.disabled ? (
          <span key={item.to} className={`tool-card tool-card--${item.tone ?? 'stone'} is-disabled`} aria-disabled="true" title={item.disabledReason}>
            <div className="tool-card-top"><span>{item.number}</span>{item.badge && <i>{item.badge}</i>}</div>
            <b className="tool-glyph" aria-hidden="true">{item.glyph}</b>
            <strong>{item.title}</strong>
            <p>{item.disabledReason || item.subtitle}</p>
            <span className="tool-arrow" aria-hidden="true">锁</span>
          </span>
        ) : (
        <Link key={item.to} to={item.to} className={`tool-card tool-card--${item.tone ?? 'stone'}`}>
          <div className="tool-card-top"><span>{item.number}</span>{item.badge && <i>{item.badge}</i>}</div>
          <b className="tool-glyph" aria-hidden="true">{item.glyph}</b>
          <strong>{item.title}</strong>
          <p>{item.subtitle}</p>
          <span className="tool-arrow" aria-hidden="true">↗</span>
        </Link>
        )
      ))}
    </nav>
  );
}

export function BackLink({ to, children = '返回工具台' }: { to: string; children?: string }) {
  return <Link to={to} className="back-link"><span aria-hidden="true">←</span>{children}</Link>;
}

export function SourceCard({ layer, title, body, source, meta }: { layer?: string; title: string; body: string; source?: string; meta?: string }) {
  return (
    <article className="source-card paper-slip">
      <div className="source-card-head">{layer && <LayerSeal layer={layer} />}{meta && <span>{meta}</span>}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {source && <footer>来源 · {source}</footer>}
    </article>
  );
}

export function EmptyPanel({ title, body }: { title: string; body: string }) {
  return <div className="empty-panel"><span aria-hidden="true">空</span><h3>{title}</h3><p>{body}</p></div>;
}
