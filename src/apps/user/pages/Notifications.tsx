import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CheckCheck, Settings2, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, IconButton, Segmented, Skeleton } from '@/shared/ui';
import { timeAgo } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { notifPermission, requestNotifPermission } from '@/shared/lib/notify';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import type { NotifType } from '@/shared/types';
import { useSession } from '../store/session';
import { Page, PageHeader } from '../components/Page';
import { notifEmoji, useVisibleFeed } from '../components/NotificationBridge';

type F = 'all' | 'order' | 'offers' | 'updates';
const MATCH: Record<F, (t: NotifType) => boolean> = {
  all: () => true,
  order: (t) => t === 'order',
  offers: (t) => t === 'offer',
  updates: (t) => t === 'store' || t === 'stock' || t === 'broadcast'
};

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export default function Notifications() {
  const nav = useNavigate();
  const { list, loading } = useVisibleFeed();
  const readIds = useSession((s) => s.readIds);
  const markRead = useSession((s) => s.markRead);
  const clear = useSession((s) => s.clearNotifications);
  const [filter, setFilter] = useState<F>('all');
  const [perm, setPerm] = useState(notifPermission());
  const [snapshotRead] = useState(() => new Set(readIds));

  // Opening the centre marks everything read, but keeps the "new" dot for this visit.
  useEffect(() => {
    if (list.length) markRead(list.map((n) => n.id));
  }, [list, markRead]);

  const shown = useMemo(() => list.filter((n) => MATCH[filter](n.type)), [list, filter]);
  const groups = useMemo(() => {
    const g = new Map<string, typeof shown>();
    shown.forEach((n) => {
      const k = dayLabel(n.at);
      g.set(k, [...(g.get(k) ?? []), n]);
    });
    return [...g.entries()];
  }, [shown]);

  const clearAll = async () => {
    const { ok } = await confirmDialog({ title: 'Clear all notifications?', confirmLabel: 'Clear all', tone: 'danger' });
    if (ok) {
      clear();
      toast({ title: 'All clear', emoji: '🧹' });
    }
  };

  return (
    <Page>
      <PageHeader
        title="Notifications"
        right={
          <>
            {list.length > 0 && (
              <IconButton label="Clear all" onClick={clearAll}><Trash2 className="h-5 w-5" /></IconButton>
            )}
            <IconButton label="Notification settings" onClick={() => nav('/settings/notifications')}><Settings2 className="h-5 w-5" /></IconButton>
          </>
        }
      />
      {perm === 'default' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card mb-4 flex items-center gap-3 border-violet/40 p-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><BellRing className="h-5 w-5" /></span>
          <p className="flex-1 text-sm"><b>Get pinged even when the app is closed.</b> Order updates, restocks and opening time.</p>
          <Button size="sm" variant="violet" onClick={async () => setPerm(await requestNotifPermission())}>Allow</Button>
        </motion.div>
      )}
      <Segmented
        label="Filter notifications"
        value={filter}
        onChange={setFilter}
        className="mb-4"
        options={[
          { value: 'all', label: 'All' },
          { value: 'order', label: 'Orders' },
          { value: 'offers', label: 'Offers' },
          { value: 'updates', label: 'Updates' }
        ]}
      />
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : !shown.length ? (
        <EmptyState emoji="🔕" title="All quiet" body="We'll let you know when your order moves, stock returns or offers drop." />
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
                {label}
                {label === 'Today' && <CheckCheck className="h-4 w-4" aria-label="All read" />}
              </h2>
              <ul className="space-y-2">
                <AnimatePresence initial={false}>
                  {items.map((n, i) => {
                    const fresh = !snapshotRead.has(n.id);
                    return (
                      <motion.li key={n.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.03 } }}>
                        {(() => {
                          const cls = cn('flex gap-3 rounded-2xl border p-3.5 transition-colors', fresh ? 'border-violet/40 bg-violet/5' : 'border-line/50 bg-surface hover:border-line');
                          const body = (
                            <>
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface2 text-xl" aria-hidden>{notifEmoji(n)}</span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-bold leading-snug">{n.title}</span>
                              {fresh && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet" aria-label="New" />}
                            </span>
                            <span className="mt-0.5 block text-sm text-muted">{n.body}</span>
                            <span className="mt-1 block text-[12px] text-muted/80">{timeAgo(n.at)}</span>
                          </span>
                            </>
                          );
                          return n.link ? <Link to={n.link} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
                        })()}
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
