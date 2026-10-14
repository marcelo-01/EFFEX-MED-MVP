import { initials } from '../utils/format';

const PALETTE = [
  ['#ccfbf1', '#0f766e'],
  ['#e0f2fe', '#0369a1'],
  ['#dcfce7', '#15803d'],
  ['#ede9fe', '#6d28d9'],
  ['#fef3c7', '#b45309'],
  ['#ffe4e6', '#be123c'],
  ['#e0e7ff', '#4338ca'],
];

function colorFor(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

interface AvatarProps {
  name: string;
  size?: number;
  muted?: boolean;
}

export function Avatar({ name, size = 44, muted = false }: AvatarProps) {
  const [background, color] = muted ? ['#e2e8f0', '#64748b'] : colorFor(name);
  return (
    <div
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background, color, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </div>
  );
}
