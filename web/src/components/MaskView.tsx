import type { SvgParts, VirtueId } from '../lib/types';
import { InkSvg } from './InkSvg';

const VIRTUE_NAMES: Record<VirtueId, string> = { ren: '仁', yi: '义', li: '礼', zhi: '智', xin: '信' };

export function MaskView({
  parts,
  virtue,
  virtueMode = false,
  glow = false,
  className = ''
}: {
  parts?: SvgParts | null;
  virtue?: VirtueId | null;
  virtueMode?: boolean;
  glow?: boolean;
  className?: string;
}) {
  const base = parts?.base ?? 'base-1';
  const aux = parts?.aux ?? [];
  const isPureWhite = !parts?.brow && !parts?.eye && !parts?.mouth && aux.length === 0;
  return (
    <div className={`mask-plinth ${className}`}>
      <div className={`mask-altar ${glow ? 'is-glow' : ''}`}>
        {glow && <div className="mask-halo" aria-hidden="true" />}
        {virtueMode ? (
          virtue
            ? <img className="mask-white-face mask-virtue-face" src={`/assets/day1/virtue-mask-${virtue}.png`} alt={`${VIRTUE_NAMES[virtue]}德傩面`} />
            : <img className="mask-white-face" src="/assets/day1/face.png" alt="白色傩面" />
        ) : isPureWhite ? <img className="mask-white-face" src="/assets/day1/face.png" alt="白色傩面" /> : <>
          <InkSvg src={`/assets/mask/${base}.svg`} className="mask-layer" title="夜郎艺术面" />
          {parts?.brow && <InkSvg src={`/assets/mask/${parts.brow}.svg`} className="mask-layer" />}
          {parts?.eye && <InkSvg src={`/assets/mask/${parts.eye}.svg`} className="mask-layer" />}
          {parts?.mouth && <InkSvg src={`/assets/mask/${parts.mouth}.svg`} className="mask-layer" />}
          {aux.map((a) => <InkSvg key={a} src={`/assets/mask/${a}.svg`} className="mask-layer" />)}
        </>}
      </div>
    </div>
  );
}
