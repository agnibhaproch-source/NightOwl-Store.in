import { memo, useId } from 'react';
import type { Product } from '../types';
import { cn } from '../lib/cn';

function readable(hex: string) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#15131f' : '#ffffff';
}

type Props = {
  product: Pick<Product, 'brand' | 'color' | 'shape' | 'image' | 'name'>;
  className?: string;
};

/**
 * Illustrated packet art generated from the product's shape + brand colour.
 * Admin-uploaded images take over when present.
 */
export const PackShot = memo(function PackShot({ product, className }: Props) {
  const uid = useId().replace(/:/g, '');
  if (product.image) {
    return (
      <img src={product.image} alt="" loading="lazy" decoding="async" draggable={false}
        className={cn('h-full w-full object-contain', className)} />
    );
  }
  const c = product.color;
  const ink = readable(c);
  const label = product.shape === 'combo' ? 'COMBO' : product.brand.replace(/[^A-Za-z0-9 ]/g, '').split(' ')[0]!.slice(0, 8).toUpperCase();
  const gloss = `g${uid}`;
  const shade = `s${uid}`;
  const txt = (x: number, y: number, size = 10, fill = c) => (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontFamily="Bricolage Grotesque, system-ui" fontWeight={800} fontSize={size} fill={fill} letterSpacing="0.5">
      {label}
    </text>
  );

  let body: JSX.Element;
  switch (product.shape) {
    case 'noodle':
      body = (
        <>
          <path d="M18 30l6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6 6-6 6 6V90l-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6-6 6-6-6Z" fill={c} />
          <rect x="28" y="42" width="64" height="22" rx="11" fill="#fff" />
          {txt(60, 53.5, 11)}
          <path d="M32 78q5-6 10 0t10 0 10 0 10 0 10 0 10 0" fill="none" stroke={ink} strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
        </>
      );
      break;
    case 'cup':
      body = (
        <>
          <path d="M33 32h54l-7 68q-20 5-40 0Z" fill={c} />
          <rect x="28" y="24" width="64" height="11" rx="5.5" fill="#f4f1ea" />
          <rect x="38" y="52" width="44" height="18" rx="9" fill="#fff" />
          {txt(60, 61.5, 9)}
          <path d="M44 84h32" stroke={ink} strokeOpacity=".35" strokeWidth="3" strokeLinecap="round" />
        </>
      );
      break;
    case 'chips':
      body = (
        <>
          <path d="M26 22h68q7 38 0 76H26q-7-38 0-76Z" fill={c} />
          <path d="M28 24h64M28 96h64" stroke="#000" strokeOpacity=".18" strokeWidth="4" strokeDasharray="2 3" />
          <ellipse cx="60" cy="55" rx="26" ry="17" fill="#fff" />
          {txt(60, 55.5, 10)}
          <ellipse cx="60" cy="82" rx="12" ry="7" fill="#f6c453" stroke="#d99a2b" strokeWidth="1.5" />
        </>
      );
      break;
    case 'tube':
      body = (
        <>
          <rect x="40" y="18" width="40" height="86" rx="8" fill={c} />
          <ellipse cx="60" cy="19" rx="20" ry="5" fill="#e8e5dc" />
          <rect x="40" y="48" width="40" height="22" fill="#fff" />
          {txt(60, 59.5, 7.5)}
          <circle cx="60" cy="86" r="7" fill="#f6c453" />
        </>
      );
      break;
    case 'biscuit':
      body = (
        <>
          <rect x="14" y="38" width="92" height="46" rx="10" fill={c} />
          <rect x="20" y="50" width="46" height="20" rx="10" fill="#fff" />
          {txt(43, 60.5, 9)}
          <circle cx="86" cy="61" r="15" fill="#c98b4a" stroke="#a86b31" strokeWidth="2" />
          <circle cx="81" cy="57" r="1.8" fill="#7a4a1f" />
          <circle cx="90" cy="60" r="1.8" fill="#7a4a1f" />
          <circle cx="84" cy="66" r="1.8" fill="#7a4a1f" />
        </>
      );
      break;
    case 'cake':
      body = (
        <>
          <rect x="20" y="30" width="80" height="62" rx="14" fill={c} />
          <rect x="32" y="44" width="56" height="30" rx="9" fill="#fff" fillOpacity=".92" />
          <rect x="38" y="52" width="44" height="7" rx="3.5" fill="#6b3a1c" />
          <rect x="38" y="59" width="44" height="4" fill="#f5e6c8" />
          <rect x="38" y="63" width="44" height="6" rx="3" fill="#8a4f28" />
          {txt(60, 83, 8.5, ink)}
        </>
      );
      break;
    case 'bottle':
      body = (
        <>
          <rect x="51" y="8" width="18" height="8" rx="2" fill="#2b2a33" />
          <path d="M52 15h16v9q0 7 6 14 8 10 6 24-2 10 2 18 4 10 0 24-2 7-8 7H48q-6 0-8-7-4-14 0-24 4-8 2-18-2-14 6-24 6-7 6-14Z" fill={c} />
          <rect x="39" y="64" width="42" height="18" fill="#fff" />
          {txt(60, 73.5, 8)}
        </>
      );
      break;
    case 'can':
      body = (
        <>
          <rect x="38" y="22" width="44" height="80" rx="9" fill={c} />
          <ellipse cx="60" cy="24" rx="22" ry="5" fill="#cfd3da" />
          <ellipse cx="60" cy="24" rx="7" ry="2" fill="#9aa0aa" />
          <rect x="38" y="52" width="44" height="18" fill="#fff" fillOpacity=".95" />
          {txt(60, 61.5, 7.5)}
        </>
      );
      break;
    case 'tetra':
      body = (
        <>
          <path d="M72 22l8-16" stroke="#e9e6ee" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 32l24-12 24 12Z" fill={c} />
          <path d="M36 32l24-12 24 12Z" fill="#000" fillOpacity=".15" />
          <rect x="36" y="32" width="48" height="70" rx="3" fill={c} />
          <circle cx="60" cy="62" r="15" fill="#ffb627" />
          <path d="M60 47q6-6 12-4" stroke="#3f8f1f" strokeWidth="3" fill="none" strokeLinecap="round" />
          {txt(60, 91, 7.5, ink)}
        </>
      );
      break;
    case 'pasta':
      body = (
        <>
          <rect x="24" y="24" width="72" height="72" rx="12" fill={c} />
          <ellipse cx="60" cy="52" rx="24" ry="16" fill="#fff" />
          {[[-12, -3, 25], [0, 3, -20], [12, -2, 35], [-5, 7, 60], [7, -8, -45]].map(([dx, dy, r], i) => (
            <rect key={i} x={60 + dx! - 6} y={52 + dy! - 2.5} width="12" height="5" rx="2.5" fill="#f2c14e" transform={`rotate(${r} ${60 + dx!} ${52 + dy!})`} />
          ))}
          {txt(60, 82, 9, ink)}
        </>
      );
      break;
    case 'bar':
      body = (
        <g transform="rotate(-14 60 60)">
          <rect x="10" y="42" width="100" height="36" rx="6" fill={c} />
          <rect x="10" y="42" width="12" height="36" rx="3" fill="#d9d6e0" />
          <rect x="98" y="42" width="12" height="36" rx="3" fill="#d9d6e0" />
          {txt(60, 60.5, 11, ink)}
        </g>
      );
      break;
    case 'box':
      body = (
        <>
          <rect x="26" y="40" width="68" height="56" rx="8" fill={c} />
          <rect x="55" y="40" width="10" height="56" fill="#fff" fillOpacity=".85" />
          <rect x="26" y="60" width="68" height="9" fill="#fff" fillOpacity=".85" />
          <ellipse cx="50" cy="36" rx="11" ry="7" fill="none" stroke="#fff" strokeWidth="4" />
          <ellipse cx="70" cy="36" rx="11" ry="7" fill="none" stroke="#fff" strokeWidth="4" />
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M44 40q0-22 16-22t16 22" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" />
          <path d="M26 40h68l-6 62H32Z" fill={c} />
          <circle cx="60" cy="68" r="19" fill="#fff" />
          {txt(60, 68.5, 8.5)}
        </>
      );
  }

  return (
    <svg viewBox="0 0 120 120" className={cn('h-full w-full', className)} role="img" aria-label={product.name}>
      <defs>
        <linearGradient id={gloss} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".38" />
          <stop offset=".45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={shade} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity=".35" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="108" rx="34" ry="5" fill={`url(#${shade})`} />
      {body}
      <g style={{ mixBlendMode: 'soft-light' }} pointerEvents="none">
        <rect x="0" y="0" width="120" height="120" fill={`url(#${gloss})`} opacity=".9" />
      </g>
    </svg>
  );
});
