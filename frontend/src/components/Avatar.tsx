import { useEffect, useState } from 'react';
import { loadImage } from '../api/http';
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

/** Resolve a URL da foto (que exige login) para uma URL que o <img> consegue exibir. */
function usePhoto(photoUrl: string | null | undefined) {
  const inline = photoUrl && (photoUrl.startsWith('data:') || photoUrl.startsWith('blob:')) ? photoUrl : null;
  const [src, setSrc] = useState<string | null>(inline);
  useEffect(() => {
    if (!photoUrl) {
      setSrc(null);
      return;
    }
    let active = true;
    loadImage(photoUrl)
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(null));
    return () => {
      active = false;
    };
  }, [photoUrl]);
  return photoUrl ? src : null;
}

interface AvatarProps {
  name: string;
  size?: number;
  muted?: boolean;
  photoUrl?: string | null;
}

export function Avatar({ name, size = 44, muted = false, photoUrl }: AvatarProps) {
  const src = usePhoto(photoUrl);
  if (src) {
    return <img className="avatar avatar--photo" src={src} alt="" aria-hidden="true" style={{ width: size, height: size }} />;
  }
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
