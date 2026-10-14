import { useId } from 'react';

interface LogoProps {
  size?: number;
  withText?: boolean;
  light?: boolean;
}

export function LogoMark({ size = 36 }: { size?: number }) {
  // Id único por instância: um gradiente dentro de um SVG oculto (display: none) não renderiza nos outros.
  const gradientId = `logo-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <path
        d="M32 4C16.5 4 4 15.6 4 30c0 7.4 3.3 14 8.6 18.8L10 60l12.6-6.1c2.9.9 6.1 1.4 9.4 1.4 15.5 0 28-11.6 28-26S47.5 4 32 4z"
        fill={`url(#${gradientId})`}
      />
      <path d="M27 18h10v8.5h8.5v10H37V45H27v-8.5h-8.5v-10H27z" fill="#fff" />
    </svg>
  );
}

export function Logo({ size = 36, withText = true, light = false }: LogoProps) {
  return (
    <div className={`logo ${light ? 'logo--light' : ''}`}>
      <LogoMark size={size} />
      {withText && (
        <span className="logo__text">
          Effex<strong>Med</strong>
        </span>
      )}
    </div>
  );
}
