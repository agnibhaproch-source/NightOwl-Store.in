import { useState } from 'react';
import { BellRing, BellOff, Send } from 'lucide-react';
import { Badge, Button, Switch } from '@/shared/ui';
import { notifPermission, requestNotifPermission, showSystemNotification } from '@/shared/lib/notify';
import { services } from '@/shared/services';
import { uid } from '@/shared/lib/format';
import { toast } from '@/shared/store/toast';
import type { NotifType } from '@/shared/types';
import { useSession } from '../store/session';
import { Page, PageHeader, Section } from '../components/Page';

const TYPES: { k: NotifType; label: string; desc: string }[] = [
  { k: 'order', label: 'Order updates', desc: 'Accepted, packed, on the way, delivered' },
  { k: 'store', label: 'Store hours', desc: 'When we open, and last call before closing' },
  { k: 'stock', label: 'Back in stock', desc: 'Items you asked us to watch' },
  { k: 'offer', label: 'Offers & coupons', desc: 'Deals, new arrivals, price drops' },
  { k: 'broadcast', label: 'Announcements', desc: 'Important news from the store' }
];

export default function NotificationSettings() {
  const prefs = useSession((s) => s.prefs);
  const setPref = useSession((s) => s.setPref);
  const userId = useSession((s) => s.userId);
  const notifyWhenOpen = useSession((s) => s.notifyWhenOpen);
  const setNotifyWhenOpen = useSession((s) => s.setNotifyWhenOpen);
  const [perm, setPerm] = useState(notifPermission());

  const test = async () => {
    const title = 'Test ping 🦉';
    const body = 'If you can read this, notifications work. Now go get snacks.';
    const shown = await showSystemNotification(title, { body, tag: 'test' });
    if (userId) {
      void services.notifications.push({ id: uid('test'), type: 'broadcast', title, body, at: Date.now(), audience: { kind: 'user', userId } });
    } else {
      toast({ title, body, emoji: '🦉' });
    }
    if (!shown && perm !== 'granted') toast({ title: 'System notifications are off', body: 'You will only see in-app alerts.', emoji: 'ℹ️' });
  };

  return (
    <Page>
      <PageHeader title="Notification settings" />
      <div className="space-y-4">
        <Section>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet">
              {perm === 'granted' ? <BellRing className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Push notifications</p>
              <p className="text-[13px] text-muted">
                {perm === 'granted' && 'On. We can reach you outside the app.'}
                {perm === 'default' && 'Allow them to hear from us when the app is closed.'}
                {perm === 'denied' && 'Blocked in your browser settings. Enable them there to get pings.'}
                {perm === 'unsupported' && 'This browser doesn’t support them. In-app alerts still work.'}
              </p>
            </div>
            {perm === 'granted' ? <Badge tone="lime">On</Badge> : perm === 'default' ? (
              <Button size="sm" variant="violet" onClick={async () => setPerm(await requestNotifPermission())}>Allow</Button>
            ) : <Badge tone="neutral">Off</Badge>}
          </div>
        </Section>
        <Section title="What to notify me about">
          <div className="space-y-4">
            {TYPES.map((t) => (
              <Switch key={t.k} label={t.label} description={t.desc} checked={prefs[t.k]} onChange={(v) => setPref(t.k, v)} />
            ))}
            <div className="border-t border-line/50 pt-4">
              <Switch label="Remind me tonight when the store opens" description="One-time alert, turns itself off after" checked={notifyWhenOpen} onChange={setNotifyWhenOpen} />
            </div>
          </div>
        </Section>
        <Button block icon={<Send className="h-4 w-4" />} onClick={test}>Send a test notification</Button>
      </div>
    </Page>
  );
}
