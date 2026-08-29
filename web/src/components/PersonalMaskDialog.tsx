import { Dialog } from './Dialog';
import { MaskView } from './MaskView';
import type { Preview } from '../lib/types';
import { createQrMatrix } from '../lib/qr';

function PersonalCode({ value }: { value: string }) {
  const payload = `YL:${value.slice(0, 12).toUpperCase()}`;
  const matrix = createQrMatrix(payload);

  return (
    <svg className="personal-code" viewBox="0 0 29 29" role="img" aria-label="个人现场核验二维码" shapeRendering="crispEdges">
      <rect width="29" height="29" fill="#f8f5eb" />
      {matrix.flatMap((row, y) => row.map((filled, x) => filled ? <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width="1" height="1" fill="#151719" /> : null))}
    </svg>
  );
}

export function PersonalMaskDialog({ open, onClose, preview, playerName, token }: { open: boolean; onClose: () => void; preview: Preview; playerName: string; token: string }) {
  return (
    <Dialog open={open} title={preview.name || `${playerName}的白面`} eyebrow="个人面具" onClose={onClose} className="mask-dialog">
      <MaskView parts={preview.svg_parts} virtue={preview.selected_virtue} virtueMode glow />
      <blockquote className="mask-motto">{preview.motto || '面纹尚浅。你走过的路，会一点点落在这里。'}</blockquote>
      <div className="code-block">
        <PersonalCode value={token} />
        <div>
          <p className="code-title">个人核验码</p>
          <p>供现场工作人员识别身份，不是社交二维码。</p>
          <code>{token.slice(0, 12).toUpperCase()}</code>
        </div>
      </div>
    </Dialog>
  );
}
