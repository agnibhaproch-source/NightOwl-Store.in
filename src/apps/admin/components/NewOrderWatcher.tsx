import { useEffect, useRef } from 'react';
import { useOrders } from '@/shared/hooks/live';
import { chime } from '@/shared/lib/sound';
import { toast } from '@/shared/store/toast';
import { inr } from '@/shared/lib/format';
import { showSystemNotification } from '@/shared/lib/notify';
import { useAdmin } from '../store/session';
import { useAdminUi } from '../store/ui';
import { APP } from '@/shared/config/app';

/** Chimes, toasts and flashes the tab title when a new order lands. */
export function NewOrderWatcher() {
  const [orders, loading] = useOrders();
  const known = useRef<Set<string> | null>(null);
  const flash = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (loading) return;
    if (!known.current) {
      known.current = new Set(orders.map((o) => o.id));
      return;
    }
    const fresh = orders.filter((o) => !known.current!.has(o.id));
    orders.forEach((o) => known.current!.add(o.id));
    if (!fresh.length) return;
    if (useAdmin.getState().sound) chime();
    navigator.vibrate?.([80, 60, 80]);
    fresh.forEach((o) => {
      toast({
        title: `New order #${o.id}`,
        body: `${o.customerName} · ${o.items.reduce((a, i) => a + i.qty, 0)} items · ${inr(o.bill.grandTotal)}`,
        emoji: '🛎️',
        duration: 8000,
        action: { label: 'Open', onClick: () => useAdminUi.getState().openOrder(o.id) }
      });
      void showSystemNotification(`New order #${o.id}`, { body: `${o.customerName} · ${inr(o.bill.grandTotal)}`, tag: `admin-${o.id}`, url: '/admin/orders' });
    });
    if (document.visibilityState === 'hidden') {
      clearInterval(flash.current);
      let on = false;
      flash.current = setInterval(() => {
        on = !on;
        document.title = on ? `🛎️ ${fresh.length} new order${fresh.length > 1 ? 's' : ''}` : `${APP.name} Admin`;
      }, 1000);
    }
  }, [orders, loading]);

  useEffect(() => {
    const stop = () => {
      if (document.visibilityState === 'visible') {
        clearInterval(flash.current);
        document.title = `${APP.name} Admin`;
      }
    };
    document.addEventListener('visibilitychange', stop);
    return () => {
      document.removeEventListener('visibilitychange', stop);
      clearInterval(flash.current);
    };
  }, []);

  return null;
}
