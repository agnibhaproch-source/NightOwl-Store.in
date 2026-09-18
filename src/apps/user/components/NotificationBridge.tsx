import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeed } from '@/shared/hooks/live';
import { useStoreStatus } from '@/shared/hooks/misc';
import { services } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { hmLabel } from '@/shared/lib/time';
import { showSystemNotification } from '@/shared/lib/notify';
import type { AppNotification, Audience, Customer } from '@/shared/types';
import { useSession } from '../store/session';
import { useCart } from '../store/cart';
import { useCurrentUser } from '../hooks';

const EMOJI: Record<AppNotification['type'], string> = {
  order: '📦',
  store: '🌙',
  stock: '🔔',
  offer: '🎁',
  broadcast: '📣'
};
export const notifEmoji = (n: AppNotification) => EMOJI[n.type];

function reaches(a: Audience, userId: string | null, customer: Customer | null) {
  if (a.kind === 'all') return true;
  if (a.kind === 'user') return !!userId && a.userId === userId;
  if (!customer) return false;
  const hostels = new Set(customer.addresses.map((x) => x.hostelId));
  return a.hostelIds.some((h) => hostels.has(h));
}

/** Notifications this user should see, newest first, respecting per-type preferences. */
export function useVisibleFeed() {
  const [feed, loading] = useFeed();
  const { userId, customer } = useCurrentUser();
  const prefs = useSession((s) => s.prefs);
  const clearedBefore = useSession((s) => s.clearedBefore);
  const list = useMemo(
    () =>
      feed
        .filter((n) => n.at > clearedBefore && prefs[n.type] && reaches(n.audience, userId, customer))
        .sort((a, b) => b.at - a.at),
    [feed, userId, customer, prefs, clearedBefore]
  );
  return { list, loading };
}

export function useUnread() {
  const { list } = useVisibleFeed();
  const readIds = useSession((s) => s.readIds);
  return useMemo(() => {
    const read = new Set(readIds);
    return list.filter((n) => !read.has(n.id)).length;
  }, [list, readIds]);
}

/**
 * Watches the live feed and turns new entries into in-app toasts and
 * system notifications. Also raises local store-hours reminders.
 */
export function NotificationBridge() {
  const { list, loading } = useVisibleFeed();
  const nav = useNavigate();
  const seen = useRef<Set<string> | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (loading) return;
    if (!seen.current) {
      seen.current = new Set(list.map((n) => n.id));
      return;
    }
    const fresh = list.filter((n) => !seen.current!.has(n.id) && n.at >= mountedAt.current - 5000);
    list.forEach((n) => seen.current!.add(n.id));
    fresh
      .slice(0, 3)
      .reverse()
      .forEach((n) => {
        toast({
          title: n.title,
          body: n.body,
          emoji: EMOJI[n.type],
          duration: 5200,
          action: n.link ? { label: 'View', onClick: () => nav(n.link!) } : undefined
        });
        void showSystemNotification(n.title, { body: n.body, tag: n.id, url: n.link ?? '/notifications' });
      });
  }, [list, loading, nav]);

  useStoreReminders();
  return null;
}

function useStoreReminders() {
  const { status, settings, loading } = useStoreStatus(20_000);
  const userId = useSession((s) => s.userId);
  const notifyWhenOpen = useSession((s) => s.notifyWhenOpen);
  const setNotify = useSession((s) => s.setNotifyWhenOpen);
  const hasCart = useCart((s) => Object.keys(s.lines).length > 0);
  const prevOpen = useRef<boolean | null>(null);

  useEffect(() => {
    if (loading || status.manual) {
      if (!loading) prevOpen.current = status.isOpen;
      return;
    }
    const audience: Audience = userId ? { kind: 'user', userId } : { kind: 'all' };
    const key = `${status.windowStart}_${userId ?? 'guest'}`;
    if (!status.isOpen && status.openingSoon && notifyWhenOpen) {
      void services.notifications.push({
        id: `store_soon_${key}`, type: 'store', audience, at: Date.now(), link: '/',
        title: 'Store opens in 10 min. Hunger check? 🍜',
        body: `Doors open at ${hmLabel(settings.openTime)}. Your cart is waiting.`
      });
    }
    if (status.isOpen && prevOpen.current === false && notifyWhenOpen) {
      void services.notifications.push({
        id: `store_open_${key}`, type: 'store', audience, at: Date.now(), link: '/',
        title: 'We’re open! 🦉',
        body: 'The night shift has begun. Snacks reach your room in minutes.'
      });
      setNotify(false);
    }
    if (status.isOpen && status.closingSoon && hasCart) {
      void services.notifications.push({
        id: `store_closing_${key}`, type: 'store', audience, at: Date.now(), link: '/cart',
        title: 'Last call, night owl ⏰',
        body: `We close at ${hmLabel(settings.closeTime)} and your cart is still sitting there.`
      });
    }
    prevOpen.current = status.isOpen;
  }, [status, settings, loading, userId, notifyWhenOpen, hasCart, setNotify]);
}
