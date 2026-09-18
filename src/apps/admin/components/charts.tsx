import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/shared/store/theme';
import { cn } from '@/shared/lib/cn';
import type { Tone } from '@/shared/types';
import { toneSoft } from '@/shared/ui';

const read = (v: string) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(v).trim().split(/\s+/).join(',')})`;

/** Resolved theme colours for Recharts (SVG attributes can't rely on Tailwind classes). */
export function useChartColors() {
  const theme = useTheme((s) => s.theme);
  return useMemo(
    () => ({
      violet: read('--violet'),
      cyan: read('--cyan'),
      lime: read('--lime'),
      pink: read('--pink'),
      amber: read('--amber'),
      muted: read('--muted'),
      line: read('--line'),
      fg: read('--fg'),
      surface: read('--surface'),
      theme
    }),
    [theme]
  );
}

export const tooltipStyle = (c: ReturnType<typeof useChartColors>) => ({
  contentStyle: { background: c.surface, border: `1px solid ${c.line}`, borderRadius: 14, fontSize: 13, boxShadow: '0 10px 30px -10px rgba(0,0,0,.4)' },
  labelStyle: { color: c.muted, marginBottom: 4 },
  itemStyle: { color: c.fg },
  cursor: { fill: c.line, opacity: 0.35 }
});

export function Kpi({
  label, value, sub, icon: Icon, tone, delay = 0, alert
}: { label: string; value: ReactNode; sub?: ReactNode; icon: LucideIcon; tone: Tone; delay?: number; alert?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 26 }}
      className={cn('card relative overflow-hidden p-4', alert && 'border-pink/50')}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className={cn('grid h-8 w-8 place-items-center rounded-xl', toneSoft[tone])}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="price mt-2 font-display text-[30px] font-extrabold leading-none tracking-tight">{value}</p>
      {sub && <p className="mt-1.5 truncate text-[12px] text-muted">{sub}</p>}
    </motion.div>
  );
}

export function Delta({ now, prev, suffix = 'vs last night' }: { now: number; prev: number; suffix?: string }) {
  if (!prev) return <span>{suffix.replace('vs', 'no data for')}</span>;
  const d = Math.round(((now - prev) / prev) * 100);
  return (
    <span>
      <b className={d >= 0 ? 'text-lime' : 'text-pink'}>{d >= 0 ? '▲' : '▼'} {Math.abs(d)}%</b> {suffix}
    </span>
  );
}
