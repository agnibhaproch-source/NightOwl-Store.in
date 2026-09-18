import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { APP } from '../config/app';

export function Blobs() {
  return (
    <div className="blob-field" aria-hidden>
      <div className="blob blob--violet" />
      <div className="blob blob--cyan" />
      <div className="blob blob--pink" />
    </div>
  );
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.02 } }
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } }
};

/** Staggered fade-up reveal when scrolled into view. Children should be <RevealItem>. */
export function Reveal({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'ul' | 'section' }) {
  const C = motion[as];
  return (
    <C className={className} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.08 }}>
      {children}
    </C>
  );
}

export function RevealItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const C = motion[as];
  return (
    <C className={className} variants={item}>
      {children}
    </C>
  );
}

export function Logo({ size = 32, withText = true, className }: { size?: number; withText?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="rgb(var(--surface-2))" />
        <path d="M40 12a20 20 0 1 0 12 32A17 17 0 0 1 40 12z" fill="rgb(var(--violet))" />
        <circle cx="25" cy="34" r="5" fill="rgb(var(--lime))" />
        <circle cx="37" cy="34" r="5" fill="rgb(var(--lime))" />
        <circle cx="25.6" cy="34.4" r="2" fill="rgb(var(--bg))" />
        <circle cx="37.6" cy="34.4" r="2" fill="rgb(var(--bg))" />
      </svg>
      {withText && <span className="font-display text-[1.35rem] font-extrabold tracking-tight">{APP.name}</span>}
    </span>
  );
}
