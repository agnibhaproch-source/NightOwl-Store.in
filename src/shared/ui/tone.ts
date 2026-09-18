import type { Tone } from '../types';

export const toneSoft: Record<Tone, string> = {
  violet: 'bg-violet/15 text-violet',
  cyan: 'bg-cyan/15 text-cyan',
  lime: 'bg-lime/15 text-lime',
  pink: 'bg-pink/15 text-pink',
  amber: 'bg-amber/15 text-amber'
};

export const toneVar: Record<Tone, string> = {
  violet: 'var(--violet)',
  cyan: 'var(--cyan)',
  lime: 'var(--lime)',
  pink: 'var(--pink)',
  amber: 'var(--amber)'
};
