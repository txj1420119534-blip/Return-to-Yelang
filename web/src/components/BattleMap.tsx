import type { BattleState } from '../lib/types';

export function BattleMap({ state }: { state: BattleState }) {
  const a = state.tower_a ?? '中立';
  const b = state.tower_b ?? '中立';
  const c = state.tower_c ?? '中立';
  const fill = (who: string) => (who === '新火盟' ? '#B8894A' : who === '守文盟' ? '#3A6B5C' : '#6b6560');

  return (
    <svg viewBox="0 0 360 210" className="w-full night-inset" role="img" aria-label="夜郎谷战场">
      <defs>
        <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a2226" />
          <stop offset="1" stopColor="#0e1216" />
        </linearGradient>
      </defs>
      <rect width="360" height="210" fill="url(#valley)" />
      <g opacity="0.12" fill="#d4a85c">
        <circle cx="40" cy="30" r="18" />
        <circle cx="300" cy="24" r="12" />
        <circle cx="200" cy="200" r="28" />
      </g>
      <path d="M0 168 C70 140 120 180 180 150 C250 118 300 170 360 148 L360 210 L0 210 Z" fill="#12181c" />
      <path d="M18 118 C70 128 90 92 140 108" fill="none" stroke="#B8894A" strokeWidth="2.2" opacity="0.85" />
      <path d="M18 132 C90 138 150 128 210 140" fill="none" stroke="#8a7a55" strokeWidth="2" opacity="0.7" />
      <path d="M18 148 C100 160 190 150 260 168" fill="none" stroke="#6a7a72" strokeWidth="2" opacity="0.7" />
      <path d="M18 160 C80 176 170 172 300 182" fill="none" stroke="#5a5048" strokeWidth="2" opacity="0.65" />
      <text x="148" y="102" fill="#B8894A" fontSize="9" letterSpacing="2">
        A
      </text>
      <text x="214" y="132" fill="#9A9284" fontSize="9">
        B
      </text>
      <text x="262" y="160" fill="#9A9284" fontSize="9">
        C
      </text>
      <text x="302" y="178" fill="#9A9284" fontSize="9">
        D
      </text>
      <path d="M40 92 H320" stroke="#5d9a84" strokeWidth="1.4" strokeDasharray="4 5" opacity="0.7" />
      <text x="148" y="86" fill="#5d9a84" fontSize="8" letterSpacing="3">
        粮草通道
      </text>
      <rect x="10" y="100" width="28" height="52" fill="#2a2e33" stroke="#B8894A" strokeWidth="1.4" />
      <text x="15" y="130" fill="#F3EBDA" fontSize="10">
        门
      </text>
      <circle cx="118" cy="58" r="9" fill={fill(a)} />
      <circle cx="196" cy="168" r="9" fill={fill(b)} />
      <circle cx="286" cy="64" r="9" fill={fill(c)} />
      <text x="110" y="48" fill="#E8E0D0" fontSize="8">
        甲
      </text>
      <text x="188" y="192" fill="#E8E0D0" fontSize="8">
        乙
      </text>
      <text x="278" y="54" fill="#E8E0D0" fontSize="8">
        丙
      </text>
      <circle cx="330" cy="128" r="7" fill="#8C2E1F" />
      <text x="318" y="148" fill="#c45a45" fontSize="8">
        终点
      </text>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={300}
          y={28 + i * 12}
          width="10"
          height="7"
          fill={(state.attacker_camps ?? 4) > i ? '#B8894A' : '#2A2E33'}
        />
      ))}
    </svg>
  );
}

export function HpBar({ label, value, hurt }: { label: string; value: number; hurt?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs tracking-widest text-ink-dim">
        <span>{label}</span>
        <span>{Math.max(0, value)}</span>
      </div>
      <div className="hp-track">
        <div
          className={`hp-fill ${hurt ? 'is-hurt' : ''}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
