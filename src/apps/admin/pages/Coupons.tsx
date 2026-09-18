import { useState } from 'react';
import { Pencil, Plus, TicketPercent, Trash2 } from 'lucide-react';
import { useCoupons } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, IconButton, Input, Segmented, Sheet, Switch } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { DAY } from '@/shared/lib/time';
import { fmtDate, inr, toDateInput } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Coupon } from '@/shared/types';
import { PageTitle } from '../components/Layout';

const blank = (): Coupon => ({ code: '', description: '', type: 'percent', value: 10, maxDiscount: 50, minOrder: 99, usageLimit: 200, used: 0, expiresAt: Date.now() + 30 * DAY, active: true });

const summary = (c: Coupon) =>
  c.type === 'percent' ? `${c.value}% off${c.maxDiscount ? `, up to ${inr(c.maxDiscount)}` : ''}` : `${inr(c.value)} off`;

export default function Coupons() {
  const [coupons] = useCoupons();
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [original, setOriginal] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const now = Date.now();

  const open = (c?: Coupon) => {
    setEditing(c ? { ...c } : blank());
    setOriginal(c?.code);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const c = { ...editing, code: editing.code.trim().toUpperCase(), description: editing.description.trim() || summary(editing) };
      if (!/^[A-Z0-9]{3,16}$/.test(c.code)) throw new Error('Code must be 3–16 letters or numbers');
      if (c.value <= 0) throw new Error('Discount must be more than zero');
      if (c.type === 'percent' && c.value > 90) throw new Error('Percent discount can’t exceed 90%');
      if (c.code !== original && coupons.some((x) => x.code === c.code)) throw new Error('That code already exists');
      await services.coupons.saveCoupon(c, original);
      toast.success(original ? 'Coupon updated' : 'Coupon created', c.code);
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    const { ok } = await confirmDialog({ title: `Delete ${c.code}?`, body: 'Carts with this code applied will lose it.', confirmLabel: 'Delete', tone: 'danger' });
    if (ok) await services.coupons.deleteCoupon(c.code);
  };

  return (
    <>
      <PageTitle title="Coupons" sub="Codes customers can apply at checkout" actions={<Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => open()}>New coupon</Button>} />
      {!coupons.length ? (
        <EmptyState emoji="🏷️" title="No coupons" action={<Button variant="primary" onClick={() => open()}>Create one</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => {
            const expired = c.expiresAt < now;
            const exhausted = c.used >= c.usageLimit;
            const live = c.active && !expired && !exhausted;
            const pct = Math.min(100, (c.used / c.usageLimit) * 100);
            return (
              <article key={c.code} className={cn('card relative overflow-hidden p-4', !live && 'opacity-70')}>
                <div aria-hidden className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
                <div aria-hidden className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-bg" />
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><TicketPercent className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold tracking-wide">{c.code}</p>
                    <p className="text-sm">{summary(c)}</p>
                  </div>
                  <Badge tone={live ? 'lime' : expired ? 'pink' : exhausted ? 'amber' : 'neutral'}>{live ? 'Live' : expired ? 'Expired' : exhausted ? 'Used up' : 'Paused'}</Badge>
                </div>
                <p className="mt-2 line-clamp-1 text-[13px] text-muted">{c.description}</p>
                <div className="mt-3 border-t border-dashed border-line pt-3 text-[12px] text-muted">
                  <div className="flex justify-between"><span>Min order {inr(c.minOrder)}</span><span>Ends {fmtDate(c.expiresAt)}</span></div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60"><div className="h-full rounded-full bg-violet" style={{ width: `${pct}%` }} /></div>
                    <span className="price">{c.used}/{c.usageLimit}</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  <div className="flex-1"><Switch label={`${c.code} active`} hideLabel checked={c.active} onChange={(v) => services.coupons.saveCoupon({ ...c, active: v })} /></div>
                  <IconButton label={`Edit ${c.code}`} onClick={() => open(c)}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton label={`Delete ${c.code}`} onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-pink" /></IconButton>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={original ? `Edit ${original}` : 'New coupon'}
        footer={<Button block variant="primary" loading={saving} onClick={save}>{original ? 'Save' : 'Create coupon'}</Button>}
      >
        {editing && (
          <div className="space-y-4">
            <Input label="Code" value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })} placeholder="MIDNIGHT25" autoFocus className="[&_input]:font-display [&_input]:text-lg [&_input]:font-bold [&_input]:tracking-wider" />
            <div>
              <span className="field-label">Discount type</span>
              <Segmented label="Discount type" value={editing.type} onChange={(v) => setEditing({ ...editing, type: v })} options={[{ value: 'percent', label: 'Percent %' }, { value: 'flat', label: 'Flat ₹' }]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label={editing.type === 'percent' ? 'Percent off' : 'Rupees off'} type="number" inputMode="numeric" value={String(editing.value)} onChange={(e) => setEditing({ ...editing, value: Math.max(0, Number(e.target.value)) })} />
              {editing.type === 'percent' && (
                <Input label="Max discount (₹)" type="number" inputMode="numeric" value={String(editing.maxDiscount ?? 0)} onChange={(e) => setEditing({ ...editing, maxDiscount: Math.max(0, Number(e.target.value)) || undefined })} hint="0 for no cap" />
              )}
              <Input label="Min order (₹)" type="number" inputMode="numeric" value={String(editing.minOrder)} onChange={(e) => setEditing({ ...editing, minOrder: Math.max(0, Number(e.target.value)) })} />
              <Input label="Usage limit" type="number" inputMode="numeric" value={String(editing.usageLimit)} onChange={(e) => setEditing({ ...editing, usageLimit: Math.max(1, Number(e.target.value)) })} hint={`Used ${editing.used} times`} />
              <Input label="Expires on" type="date" value={toDateInput(editing.expiresAt)} onChange={(e) => setEditing({ ...editing, expiresAt: new Date(`${e.target.value}T23:59:59`).getTime() })} />
            </div>
            <Input label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder={summary(editing)} hint="Shown to customers in the coupon list" />
            <Switch label="Active" checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
          </div>
        )}
      </Sheet>
    </>
  );
}
