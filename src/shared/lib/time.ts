import type { StoreSettings } from '../types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export const hmToMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const hmLabel = (hm: string) => {
  const total = hmToMin(hm);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
};

type Hours = Pick<StoreSettings, 'mode' | 'openTime' | 'closeTime'>;

export interface StoreStatus {
  isOpen: boolean;
  manual: boolean;
  nextChangeAt: number | null;
  msToChange: number | null;
  closingSoon: boolean;
  openingSoon: boolean;
  windowStart: number;
  windowEnd: number;
}

function windows(now: number, s: Hours): [number, number][] {
  const openM = hmToMin(s.openTime);
  const closeM = hmToMin(s.closeTime);
  const dur = ((closeM - openM + 1440) % 1440 || 1440) * MIN;
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return [-1, 0, 1].map((k) => {
    const d = new Date(base);
    d.setDate(d.getDate() + k);
    d.setMinutes(openM);
    return [d.getTime(), d.getTime() + dur];
  });
}

export function getStoreStatus(now: number, s: Hours): StoreStatus {
  const ws = windows(now, s);
  const current = ws.find(([a, b]) => now >= a && now < b);
  const next = ws.find(([a]) => a > now) ?? ws[2]!;
  const win = current ?? next;
  if (s.mode !== 'auto') {
    return {
      isOpen: s.mode === 'open', manual: true, nextChangeAt: null, msToChange: null,
      closingSoon: false, openingSoon: false, windowStart: win[0], windowEnd: win[1]
    };
  }
  if (current) {
    const ms = current[1] - now;
    return {
      isOpen: true, manual: false, nextChangeAt: current[1], msToChange: ms,
      closingSoon: ms <= 30 * MIN, openingSoon: false, windowStart: current[0], windowEnd: current[1]
    };
  }
  const ms = next[0] - now;
  return {
    isOpen: false, manual: false, nextChangeAt: next[0], msToChange: ms,
    closingSoon: false, openingSoon: ms <= 15 * MIN, windowStart: next[0], windowEnd: next[1]
  };
}

/** The night running now, or the most recent one that ended. */
export function latestNight(now: number, s: Pick<StoreSettings, 'openTime' | 'closeTime'>): [number, number] {
  const ws = windows(now, { ...s, mode: 'auto' });
  const started = ws.filter(([a]) => a <= now);
  return started[started.length - 1] ?? ws[0]!;
}

export function fmtDuration(ms: number) {
  const m = Math.ceil(ms / MIN);
  if (m <= 1) return 'a minute';
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (!h) return `${mm}m`;
  return mm ? `${h}h ${mm}m` : `${h}h`;
}

export function fmtClock(ms: number) {
  const t = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Hour buckets for a night window: 9 PM, 10 PM ... 1 AM */
export function hourBuckets(start: number, end: number) {
  const out: { label: string; from: number; to: number }[] = [];
  for (let t = start; t < end; t += HOUR) {
    const h = new Date(t).getHours();
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    out.push({ label: `${h12} ${ap}`, from: t, to: Math.min(end, t + HOUR) });
  }
  return out;
}
