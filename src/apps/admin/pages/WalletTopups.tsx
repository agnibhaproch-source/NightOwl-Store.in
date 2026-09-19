import { Check, Wallet } from 'lucide-react';
import { useTopups } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, Skeleton } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { fmtDateTime, inr, timeAgo } from '@/shared/lib/format';
import { useNow } from '@/shared/hooks/misc';
import type { WalletTopup } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';

async function confirm(t: WalletTopup) {
  const { ok } = await confirmDialog({
    title: `Confirm top-up ${t.code}?`,
    body: `Only confirm if ${inr(t.amount)} from ${t.customerName} is already in your GPay/bank account. It will be added to their wallet straight away.`,
    confirmLabel: 'Yes, money received'
  });
  if (!ok) return;
  try {
    await services.wallet.confirmTopup(t.id);
    toast({ title: `${inr(t.amount)} added to ${t.customerName}’s wallet`, emoji: '💰', duration: 2500 });
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

export default function WalletTopups() {
  const [topups, loading] = useTopups();
  const now = useNow(30_000);
  const pending = topups.filter((t) => t.status === 'pending');
  const done = topups.filter((t) => t.status !== 'pending').slice(0, 60);

  return (
    <>
      <PageTitle title="Wallet top-ups" sub="Customers who paid by GPay to add money. Confirm once it shows in your account." />
      {loading ? (
        <Skeleton className="h-40 rounded-3xl" />
      ) : (
        <div className="space-y-4">
          <Panel title={`Waiting for you · ${pending.length}`}>
            {!pending.length ? (
              <EmptyState emoji="💰" title="No top-ups waiting" body="New requests appear here the moment a customer starts one." />
            ) : (
              <ul className="divide-y divide-line/50">
                {pending.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="rounded-md bg-violet/15 px-2 py-1 font-display text-lg font-extrabold tracking-[0.15em] text-violet">{t.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{t.customerName} <span className="font-normal text-muted">{t.phone && `· +91 ${t.phone}`}</span></p>
                      <p className="text-[12px] text-muted">Asked {timeAgo(t.createdAt, now)}</p>
                    </div>
                    <span className="price font-display text-xl font-extrabold">{inr(t.amount)}</span>
                    <Button variant="primary" icon={<Check className="h-4 w-4" />} onClick={() => confirm(t)}>Confirm payment</Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent" flush>
            {!done.length ? (
              <p className="p-6 text-center text-sm text-muted">Nothing yet.</p>
            ) : (
              <div className="overflow-x-auto" data-lenis-prevent>
                <table className="w-full min-w-[520px] text-sm">
                  <tbody className="divide-y divide-line/40">
                    {done.map((t) => (
                      <tr key={t.id}>
                        <td className="px-4 py-2.5"><span className="font-display font-extrabold tracking-[0.15em] text-violet">{t.code}</span></td>
                        <td className="px-4 py-2.5">{t.customerName}</td>
                        <td className="price px-4 py-2.5 font-semibold">{inr(t.amount)}</td>
                        <td className="px-4 py-2.5 text-muted">{fmtDateTime(t.paidAt ?? t.createdAt)}</td>
                        <td className="px-4 py-2.5"><Badge tone={t.status === 'paid' ? 'lime' : 'pink'}>{t.status === 'paid' ? 'Added' : 'Cancelled'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
      <p className="mt-4 flex items-center gap-2 text-[12px] text-muted"><Wallet className="h-4 w-4" /> Wallet money can only be spent on orders; cancelled wallet-paid orders are refunded automatically.</p>
    </>
  );
}
