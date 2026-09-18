import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Plus, Power, RotateCcw, Save, Sun, Trash2, X } from 'lucide-react';
import { useSettings } from '@/shared/hooks/live';
import { useStoreStatus } from '@/shared/hooks/misc';
import { Badge, Button, IconButton, Input, NightDial, Switch } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { computeBill } from '@/shared/lib/bill';
import { fmtDuration, hmLabel } from '@/shared/lib/time';
import { inr, slug } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { Hostel, StoreSettings } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';

const MODES: { v: StoreSettings['mode']; label: string; desc: string; icon: typeof Power; tone: string }[] = [
  { v: 'auto', label: 'Follow schedule', desc: 'Opens and closes on the hours below', icon: Moon, tone: 'border-violet bg-violet/10 text-violet' },
  { v: 'open', label: 'Force open', desc: 'Open now, ignoring the schedule', icon: Sun, tone: 'border-lime bg-lime/10 text-lime' },
  { v: 'closed', label: 'Force closed', desc: 'Pause orders, e.g. stock-taking', icon: Power, tone: 'border-pink bg-pink/10 text-pink' }
];

function Num({ label, value, onChange, prefix = '₹', hint }: { label: string; value: number; onChange: (n: number) => void; prefix?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <span className="relative block">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">{prefix}</span>}
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={String(value)}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className={cn('field', prefix && 'pl-8')}
        />
      </span>
      {hint && <span className="mt-1 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

function HostelEditor({ h, onChange, onRemove }: { h: Hostel; onChange: (h: Hostel) => void; onRemove: () => void }) {
  const [block, setBlock] = useState('');
  const addBlock = () => {
    const b = block.trim().toUpperCase();
    if (!b || h.blocks.includes(b)) return;
    onChange({ ...h, blocks: [...h.blocks, b] });
    setBlock('');
  };
  return (
    <div className={cn('rounded-2xl border p-3', h.active ? 'border-line/70' : 'border-dashed border-line/70 opacity-70')}>
      <div className="flex items-end gap-2">
        <Input label="Hostel name" value={h.name} onChange={(e) => onChange({ ...h, name: e.target.value })} className="flex-1" />
        <Input label="Short" value={h.short} onChange={(e) => onChange({ ...h, short: e.target.value.toUpperCase().slice(0, 6) })} className="w-24" />
        <IconButton label={`Remove ${h.name}`} onClick={onRemove} className="mb-0.5"><Trash2 className="h-4 w-4 text-pink" /></IconButton>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] font-semibold text-muted">Blocks</span>
        {h.blocks.map((b) => (
          <span key={b} className="inline-flex h-8 items-center gap-1 rounded-lg bg-surface2 pl-2.5 pr-1 text-sm font-bold">
            {b}
            <button aria-label={`Remove block ${b}`} onClick={() => onChange({ ...h, blocks: h.blocks.filter((x) => x !== b) })} className="grid h-6 w-6 place-items-center rounded-md hover:bg-line/60">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); addBlock(); }} className="flex items-center gap-1">
          <input value={block} onChange={(e) => setBlock(e.target.value)} placeholder="Add" aria-label={`Add block to ${h.name}`} className="h-8 w-16 rounded-lg border border-line bg-transparent px-2 text-sm uppercase outline-none focus:border-violet" />
          <IconButton label="Add block" type="submit" className="h-8 w-8"><Plus className="h-4 w-4" /></IconButton>
        </form>
      </div>
      <div className="mt-3"><Switch label="Deliver here" checked={h.active} onChange={(v) => onChange({ ...h, active: v })} /></div>
    </div>
  );
}

export default function StoreControls() {
  const [settings, loading] = useSettings();
  const { status, now } = useStoreStatus(10_000);
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setDraft(settings);
    // Reset the form only on first load; live mode changes are applied separately below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const dirty = useMemo(() => {
    const { mode: _a, ...x } = draft;
    const { mode: _b, ...y } = settings;
    return JSON.stringify(x) !== JSON.stringify(y);
  }, [draft, settings]);

  const set = <K extends keyof StoreSettings>(k: K, v: StoreSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const setMode = async (mode: StoreSettings['mode']) => {
    if (mode === settings.mode) return;
    if (mode === 'closed') {
      const { ok } = await confirmDialog({ title: 'Close the store now?', body: 'Customers can still browse but can’t order. Open orders are not affected.', confirmLabel: 'Close store', tone: 'danger' });
      if (!ok) return;
    }
    await services.settings.updateSettings({ mode });
    setDraft((d) => ({ ...d, mode }));
    toast({ title: mode === 'auto' ? 'Following the schedule' : mode === 'open' ? 'Store forced open' : 'Store closed', emoji: mode === 'closed' ? '🔴' : '🟢' });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (draft.etaMin > draft.etaMax) throw new Error('ETA minimum is above maximum');
      if (!draft.hostels.some((h) => h.active)) throw new Error('At least one hostel must be serviceable');
      if (draft.hostels.some((h) => !h.name.trim() || !h.blocks.length)) throw new Error('Every hostel needs a name and at least one block');
      const { mode: _m, ...rest } = draft;
      await services.settings.updateSettings(rest);
      toast.success('Store settings saved', 'The customer app updated instantly.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const sample = (total: number) => computeBill([{ price: total, mrp: total, qty: 1 }], draft, undefined).bill;

  const addHostel = () =>
    set('hostels', [...draft.hostels, { id: slug(`h-${Date.now()}`), name: 'New hostel', short: 'NH', blocks: ['A'], active: true }]);

  return (
    <>
      <PageTitle
        title="Store controls"
        sub="Everything here syncs to the customer app the moment you save."
        actions={
          <>
            <Button icon={<RotateCcw className="h-4 w-4" />} disabled={!dirty} onClick={() => setDraft({ ...settings })}>Discard</Button>
            <Button variant="primary" icon={<Save className="h-4 w-4" />} disabled={!dirty} loading={saving} onClick={save}>Save changes</Button>
          </>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Panel title="Open / close" action={<Badge tone={status.isOpen ? 'lime' : 'pink'}>{status.isOpen ? 'Open now' : 'Closed now'}</Badge>}>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Store mode">
              {MODES.map((m) => {
                const on = settings.mode === m.v;
                return (
                  <button
                    key={m.v}
                    role="radio"
                    aria-checked={on}
                    onClick={() => setMode(m.v)}
                    className={cn('relative rounded-2xl border-2 p-4 text-left transition-colors', on ? m.tone : 'border-line/60 hover:border-line')}
                  >
                    <m.icon className="h-5 w-5" />
                    <p className={cn('mt-2 font-bold', !on && 'text-fg')}>{m.label}</p>
                    <p className="text-[12px] text-muted">{m.desc}</p>
                    {on && <motion.span layoutId="mode-dot" className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-current" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-sm">
              <label className="block"><span className="field-label">Opens at</span><input type="time" className="field" value={draft.openTime} onChange={(e) => set('openTime', e.target.value)} /></label>
              <label className="block"><span className="field-label">Closes at</span><input type="time" className="field" value={draft.closeTime} onChange={(e) => set('closeTime', e.target.value)} /></label>
            </div>
            <p className="mt-2 text-[12px] text-muted">Closing time past midnight rolls into the next day. Schedule: {hmLabel(draft.openTime)} – {hmLabel(draft.closeTime)}.</p>
          </Panel>

          <Panel title="Fees & thresholds">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Num label="Delivery fee" value={draft.deliveryFee} onChange={(n) => set('deliveryFee', n)} hint="Charged on every order, never free" />
              <Num label="Platform fee" value={draft.convenienceFee} onChange={(n) => set('convenienceFee', n)} hint="Charged on every order" />
              <Num label="Minimum order" value={draft.minOrderValue} onChange={(n) => set('minOrderValue', n)} hint="Cart must reach this to checkout" />
              <Num label="ETA from (min)" prefix="" value={draft.etaMin} onChange={(n) => set('etaMin', n)} />
              <Num label="ETA to (min)" prefix="" value={draft.etaMax} onChange={(n) => set('etaMax', n)} />
            </div>
          </Panel>

          <Panel title="Serviceable hostels" action={<Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={addHostel}>Add hostel</Button>}>
            <div className="grid gap-3 lg:grid-cols-2">
              {draft.hostels.map((h, i) => (
                <HostelEditor
                  key={h.id}
                  h={h}
                  onChange={(nh) => set('hostels', draft.hostels.map((x, k) => (k === i ? nh : x)))}
                  onRemove={async () => {
                    const { ok } = await confirmDialog({ title: `Remove ${h.name}?`, body: 'Customers with rooms here will need to pick another hostel. Tip: turning off “Deliver here” is reversible.', confirmLabel: 'Remove', tone: 'danger' });
                    if (ok) set('hostels', draft.hostels.filter((_, k) => k !== i));
                  }}
                />
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Panel title="Live status">
            <NightDial status={status} now={now} />
            <p className="mt-2 text-center text-sm text-muted">
              {status.manual ? 'Manual override is on.' : status.msToChange != null ? `${status.isOpen ? 'Closes' : 'Opens'} in ${fmtDuration(status.msToChange)}` : ''}
            </p>
          </Panel>
          <Panel title="Bill preview">
            <p className="mb-2 text-[12px] text-muted">What a customer pays with your {dirty ? 'unsaved ' : ''}settings</p>
            <table className="w-full text-sm">
              <thead className="text-[12px] text-muted"><tr><th className="py-1 text-left font-medium">Cart</th><th className="text-right font-medium">Fees</th><th className="text-right font-medium">Pays</th></tr></thead>
              <tbody className="divide-y divide-line/40">
                {[49, 99, 149, 199, 299].map((t) => {
                  const b = sample(t);
                  const blocked = t < draft.minOrderValue;
                  return (
                    <tr key={t} className={cn(blocked && 'text-muted line-through')}>
                      <td className="price py-1.5">{inr(t)}</td>
                      <td className="price text-right">{inr(b.deliveryFee + b.convenienceFee)}</td>
                      <td className="price text-right font-bold">{inr(b.grandTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>
          {dirty && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-amber/40 bg-amber/10 p-3 text-sm">
              You have unsaved changes. <button onClick={save} className="font-bold text-amber underline">Save now</button>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
