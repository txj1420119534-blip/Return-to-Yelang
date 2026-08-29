import { useEffect, useState } from 'react';

const cache = new Map<string, string>();

function sanitizeSvg(raw: string) {
  const parsed = new DOMParser().parseFromString(raw, 'image/svg+xml');
  const root = parsed.documentElement;
  if (root.localName !== 'svg' || parsed.querySelector('parsererror')) return '';
  root.querySelectorAll('script, foreignObject, iframe, object, embed, link, meta, style').forEach((node) => node.remove());
  root.querySelectorAll('*').forEach((node) => {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const externalReference = (name === 'href' || name === 'xlink:href') && !value.startsWith('#');
      if (name.startsWith('on') || externalReference || (name === 'style' && /url\s*\(|expression\s*\(/i.test(value))) {
        node.removeAttribute(attribute.name);
      }
    }
  });
  return root.outerHTML;
}

export function InkSvg({
  src,
  className,
  title
}: {
  src: string;
  className?: string;
  title?: string;
}) {
  const [markup, setMarkup] = useState(cache.get(src) ?? '');

  useEffect(() => {
    if (cache.has(src)) {
      setMarkup(cache.get(src)!);
      return;
    }
    let alive = true;
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error('missing'))))
      .then((t) => {
        const cleaned = sanitizeSvg(t);
        if (!cleaned) throw new Error('invalid svg');
        cache.set(src, cleaned);
        if (alive) setMarkup(cleaned);
      })
      .catch(() => {
        if (alive) setMarkup('');
      });
    return () => {
      alive = false;
    };
  }, [src]);

  if (!markup) {
    return <div className={className} aria-hidden="true" />;
  }

  return (
    <div
      className={`ink-svg ${className ?? ''}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
