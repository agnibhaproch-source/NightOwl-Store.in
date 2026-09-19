import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Loader2, Plus, RotateCcw, ShieldCheck, Wallet as WalletIcon } from 'lucide-react';
import { Button, EmptyState } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { useUserTopups, useUserTxns } from '@/shared/hooks/live';
import { toast } from '@/shared/store/toast';
import { fmtDateTime, inr } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { WalletTxn } from '@/shared/types';
import { useCurrentUser } from '../hooks';
import { Page, PageHeader, Section } from '../components/Page';
import { LoginPrompt } from '../components/LoginPrompt';
import { UpiQr } from '../components/UpiQr';

const PRESETS = [50, 100, 200, 500];
const ICON: Record<WalletTxn['type'], typeof Plus> = { topup: ArrowDownLeft, spend: ArrowUpRight, refund: RotateCcw };

export default function Wallet() {
  const { userId, customer } = useCurrentUser();
  const [topups] = useUserTopups(userId);
  const [txns, txLoading] = useUserTxns(userId);
  const [amount, setAmount] = useState(100);
  const [busy, setBusy] = useState(false);

  if (!userId)
    return (
      <Page>
        <PageHeader title="Wallet" />
        <LoginPrompt emoji="💰" title="Log in to use your wallet" body="Add money once, pay in one tap." />
      </Page>
    );

  const balance = customer?.walletBalance ?? 0;
  const pending = topups.find((t) => t.status === 'pending');

  const start = async () => {
    setBusy(true);
    try {
      await services.wallet.createTopup(userId, amount);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!pending) return;
    try {
      await services.wallet.cancelTopup(pending.id, userId);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Page>
      <PageHeader title="Wallet" sub="Add money once, pay in one tap" back="/profile" />
      <div className="space-y-4">
        <Section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--lime) / .3), transparent)' }} />
          <div className="relative flex items-center gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><WalletIcon className="h-7 w-7" /></span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Wallet balance</p>
              <p className="price font-display text-4xl font-extrabold">{inr(balance)}</p>
            </div>
          </div>
        </Section>

        {pending ? (
          <Section title="Finish your top-up">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-violet/10 p-3">
              <div>
                <p className="text-sm font-semibold text-violet">Top-up code</p>
                <p className="text-[12px] text-muted">Type this in the GPay note</p>
              </div>
              <span className="price font-display text-3xl font-extrabold tracking-[0.2em] text-violet">{pending.code}</span>
            </div>
            <UpiQr amount={pending.amount} />
            <div className="mt-3 rounded-card border border-amber/40 bg-amber/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-amber"><Loader2 className="h-4 w-4 animate-spin" /> Waiting for the store to confirm…</p>
              <p className="mt-1 text-[12px] text-muted">Your balance updates by itself once they see {inr(pending.amount)} arrive.</p>
              <button onClick={cancel} className="hit mt-1 text-[13px] font-semibold text-pink">Cancel top-up</button>
            </div>
          </Section>
        ) : (
          <Section title="Add money">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((v) => (
                <button key={v} className="chip" aria-pressed={amount === v} onClick={() => setAmount(v)}>{inr(v)}</button>
              ))}
            </div>
            <label className="mt-3 block">
              <span className="field-label">Or enter an amount</span>
              <span className="relative block">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">₹</span>
                <input className="field pl-8" inputMode="numeric" value={String(amount || '')} onChange={(e) => setAmount(Math.min(5000, Number(e.target.value.replace(/\D/g, '')) || 0))} />
              </span>
            </label>
            <Button className="mt-4" variant="primary" size="lg" block loading={busy} disabled={amount < 10} icon={<Plus className="h-5 w-5" />} onClick={start}>
              Add {inr(amount)} with GPay
            </Button>
            <p className="mt-3 flex items-start gap-2 text-[12px] text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
              You scan our QR and pay. The store checks it arrived, then the money lands in your wallet. Min ₹10, max ₹5000.
            </p>
          </Section>
        )}

        <Section title="History" flush className="px-4 pt-4">
          {txLoading ? (
            <div className="grid place-items-center py-8 text-muted"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : !txns.length ? (
            <EmptyState emoji="🧾" title="No activity yet" body="Top-ups and payments show up here." />
          ) : (
            <ul className="-mx-4 divide-y divide-line/50">
              {txns.map((t) => {
                const Icon = ICON[t.type];
                const plus = t.type !== 'spend';
                return (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', plus ? 'bg-lime/15 text-lime' : 'bg-surface2 text-muted')}><Icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{t.note}</span>
                      <span className="text-[12px] text-muted">{fmtDateTime(t.at)}</span>
                    </span>
                    <span className={cn('price font-bold', plus && 'text-lime')}>{plus ? '+' : '−'}{inr(t.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </Page>
  );
}
