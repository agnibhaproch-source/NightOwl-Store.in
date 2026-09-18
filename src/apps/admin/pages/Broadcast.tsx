import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Send, Users } from 'lucide-react';
import { useBroadcasts, useCustomers, useSettings } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, Input, Segmented, Switch, Textarea } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { fmtDateTime, timeAgo } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useAdmin } from '../store/session';
import { PageTitle, Panel } from '../components/Layout';

const TEMPLATES = [
  { emoji: '🟢', title: 'We’re open!', body: 'Doors are open till 2 AM. Maggi is hot, drinks are cold.', type: 'broadcast' as const },
  { emoji: '⏰', title: 'Last call tonight', body: 'Closing in 30 minutes. Get your order in now.', type: 'broadcast' as const },
  { emoji: '🎉', title: 'Flat ₹40 off', body: 'Use FIRSTBITE on orders above ₹199. Tonight only.', type: 'offer' as const },
  { emoji: '📦', title: 'Fresh stock in', body: 'Buldak, Red Bull and choco brownies are back on the shelf.', type: 'offer' as const }
];

export default function Broadcast() {
  const [settings] = useSettings();
  const [customers] = useCustomers();
  const [logs] = useBroadcasts();
  const session = useAdmin((s) => s.session)!;
  const [type, setType] = useState<'broadcast' | 'offer'>('broadcast');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [all, setAll] = useState(true);
  const [hostelIds, setHostelIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const reach = useMemo(() => {
    const active = customers.filter((c) => !c.blocked);
    if (all) return active.length;
    return active.filter((c) => c.addresses.some((a) => hostelIds.includes(a.hostelId))).length;
  }, [customers, all, hostelIds]);

  const send = async () => {
    const { ok } = await confirmDialog({
      title: `Send to ${reach} customer${reach === 1 ? '' : 's'}?`,
      body: 'They get an in-app alert now, plus a push notification if they allowed it.',
      confirmLabel: 'Send now'
    });
    if (!ok) return;
    setSending(true);
    try {
      if (!title.trim() || !body.trim()) throw new Error('Add a title and a message');
      if (!all && !hostelIds.length) throw new Error('Pick at least one hostel');
      await services.notifications.broadcast({ title: title.trim(), body: body.trim(), type, hostelIds: all ? null : hostelIds, by: session.name });
      toast.success('Broadcast sent', `${reach} customers notified`);
      setTitle('');
      setBody('');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageTitle title="Broadcast" sub="Send an announcement or an offer to your customers" />
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        <Panel title="Compose">
          <div className="space-y-4">
            <div>
              <span className="field-label">Type</span>
              <Segmented
                label="Notification type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'broadcast', label: '📣 Announcement' },
                  { value: 'offer', label: '🎉 Offer' }
                ]}
              />
              <p className="mt-1.5 text-[12px] text-muted">
                Customers who turned off {type === 'offer' ? '“Offers & coupons”' : '“Announcements”'} in their settings won’t see this.
              </p>
            </div>
            <Input label="Title" value={title} maxLength={48} onChange={(e) => setTitle(e.target.value)} placeholder="We’re open!" />
            <Textarea label="Message" value={body} maxLength={160} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="Doors are open till 2 AM." hint={`${body.length}/160 characters`} />
            <div>
              <span className="field-label">Quick templates</span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button key={t.title} className="chip" onClick={() => { setTitle(t.title); setBody(t.body); setType(t.type); }}>
                    <span aria-hidden>{t.emoji}</span> {t.title}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line/60 p-3">
              <Switch label="Send to everyone" description={`${customers.filter((c) => !c.blocked).length} active customers`} checked={all} onChange={setAll} />
              {!all && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 flex flex-wrap gap-2 overflow-hidden">
                  {settings.hostels.map((h) => (
                    <button
                      key={h.id}
                      className="chip"
                      aria-pressed={hostelIds.includes(h.id)}
                      onClick={() => setHostelIds((x) => (x.includes(h.id) ? x.filter((y) => y !== h.id) : [...x, h.id]))}
                    >
                      {h.short} · {h.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Button variant="primary" size="lg" block loading={sending} disabled={!title.trim() || !body.trim()} icon={<Send className="h-4 w-4" />} onClick={send}>
              Send to {reach} customer{reach === 1 ? '' : 's'}
            </Button>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Preview">
            <div className="rounded-2xl border border-line/70 bg-surface2/50 p-3">
              <div className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface text-xl" aria-hidden>{type === 'offer' ? '🎉' : '📣'}</span>
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{title || 'Your title appears here'}</p>
                  <p className="text-sm text-muted">{body || 'And the message body, just like the customer sees it.'}</p>
                  <p className="mt-1 text-[12px] text-muted/80">just now</p>
                </div>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted"><Users className="h-3.5 w-3.5" /> Reaching {reach} of {customers.length} customers</p>
          </Panel>
          <Panel title="Recently sent" flush>
            {!logs.length ? (
              <EmptyState emoji="📭" title="Nothing sent yet" className="py-8" />
            ) : (
              <ul className="max-h-[420px] divide-y divide-line/50 overflow-y-auto" data-lenis-prevent>
                {logs.map((l) => (
                  <li key={l.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge tone={l.type === 'offer' ? 'lime' : 'violet'}>{l.type === 'offer' ? 'Offer' : 'Announcement'}</Badge>
                      <span className="ml-auto text-[12px] text-muted" title={fmtDateTime(l.at)}>{timeAgo(l.at)}</span>
                    </div>
                    <p className="mt-1 font-semibold">{l.title}</p>
                    <p className="text-[13px] text-muted">{l.body}</p>
                    <p className={cn('mt-1 text-[12px]', l.hostelIds ? 'text-cyan' : 'text-muted')}>
                      {l.hostelIds
                        ? `To ${l.hostelIds.map((id) => settings.hostels.find((h) => h.id === id)?.short ?? id).join(', ')}`
                        : 'To everyone'} · by {l.by}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <p className="flex items-start gap-2 rounded-2xl bg-surface2/50 p-3 text-[12px] text-muted">
            <Megaphone className="h-4 w-4 shrink-0" /> Keep it short and useful. Too many pings and people mute you.
          </p>
        </div>
      </div>
    </>
  );
}
