import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useProducts } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, IconButton, Input, PackShot, Textarea } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { normalize } from '@/shared/lib/search';
import { inr } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import type { ComboItem, Product } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';
import { blankProduct, margin } from '../components/ProductEditor';

export default function Combos() {
  const [products] = useProducts();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const combos = products.filter((p) => p.categoryId === 'combos');
  const singles = products.filter((p) => p.categoryId !== 'combos' && p.active);
  const [draft, setDraft] = useState<Product | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const items = draft?.comboItems ?? [];
  const sumPrice = items.reduce((a, i) => a + (byId.get(i.productId)?.price ?? 0) * i.qty, 0);
  const sumCost = items.reduce((a, i) => a + (byId.get(i.productId)?.cost ?? 0) * i.qty, 0);
  const maxStock = items.length ? Math.min(...items.map((i) => Math.floor((byId.get(i.productId)?.stock ?? 0) / i.qty))) : 0;

  const start = (p?: Product) => {
    if (p) setDraft({ ...p, comboItems: p.comboItems ?? [] });
    else setDraft({ ...blankProduct('combos'), shape: 'combo', color: '#7a2bbd', brand: 'NightOwl', unit: 'Combo', comboItems: [] });
    setQ('');
  };

  const setItems = (next: ComboItem[]) => {
    if (!draft) return;
    const price = next.reduce((a, i) => a + (byId.get(i.productId)?.price ?? 0) * i.qty, 0);
    const cost = next.reduce((a, i) => a + (byId.get(i.productId)?.cost ?? 0) * i.qty, 0);
    const suggested = Math.max(cost, Math.round(price * 0.9));
    setDraft({ ...draft, comboItems: next, mrp: price, cost, price: draft.price && draft.price <= price ? Math.max(draft.price, cost) : suggested, unit: `${next.reduce((a, i) => a + i.qty, 0)} items` });
  };
  const add = (id: string) => {
    const ex = items.find((i) => i.productId === id);
    setItems(ex ? items.map((i) => (i.productId === id ? { ...i, qty: i.qty + 1 } : i)) : [...items, { productId: id, qty: 1 }]);
  };
  const dec = (id: string) => setItems(items.flatMap((i) => (i.productId !== id ? [i] : i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : [])));

  const picker = useMemo(() => {
    const t = normalize(q);
    return singles.filter((p) => !t || normalize(`${p.name} ${p.brand}`).includes(t)).slice(0, 30);
  }, [singles, q]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (items.length < 2) throw new Error('A combo needs at least two items');
      if (!draft.name.trim()) throw new Error('Give the combo a name');
      if (draft.price > sumPrice) throw new Error('Combo price should be less than buying separately');
      const stock = draft.stock || Math.min(maxStock, 20);
      await services.products.saveProduct({ ...draft, name: draft.name.trim(), stock, tags: ['combo', ...draft.tags.filter((t) => t !== 'combo')] });
      toast.success('Combo saved', `Customers save ${inr(sumPrice - draft.price)}`);
      setDraft(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    const { ok } = await confirmDialog({ title: `Delete ${p.name}?`, confirmLabel: 'Delete', tone: 'danger' });
    if (ok) await services.products.deleteProduct(p.id);
  };

  return (
    <>
      <PageTitle
        title="Combo builder"
        sub="Bundle items at a lower price. They show in the Midnight combos rail."
        actions={!draft && <Button variant="primary" icon={<Sparkles className="h-4 w-4" />} onClick={() => start()}>New combo</Button>}
      />
      <AnimatePresence mode="wait">
        {draft ? (
          <motion.div key="builder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Panel title="Pick items">
              <label className="relative mb-3 block">
                <span className="sr-only">Search items</span>
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input className="field pl-10" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
              <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4" data-lenis-prevent>
                {picker.map((p) => {
                  const inCombo = items.find((i) => i.productId === p.id);
                  return (
                    <button key={p.id} onClick={() => add(p.id)} className={cn('relative rounded-2xl border p-2 text-left transition-colors', inCombo ? 'border-violet bg-violet/10' : 'border-line/60 hover:border-line')}>
                      {inCombo && <span className="absolute right-2 top-2 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-violet px-1.5 text-[12px] font-bold text-white">{inCombo.qty}</span>}
                      <span className="block aspect-square rounded-xl p-2" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>
                      <span className="mt-1.5 line-clamp-2 block text-[13px] font-semibold leading-tight">{p.name}</span>
                      <span className="text-[12px] text-muted">{inr(p.price)} · {p.stock} left</span>
                    </button>
                  );
                })}
              </div>
            </Panel>
            <Panel title={draft.id && combos.some((c) => c.id === draft.id) ? 'Edit combo' : 'New combo'} action={<IconButton label="Close builder" onClick={() => setDraft(null)}><X className="h-4 w-4" /></IconButton>} className="lg:sticky lg:top-20 lg:self-start">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <span className="h-20 w-20 shrink-0 rounded-2xl p-2" style={{ background: `${draft.color}33` }}><PackShot product={{ ...draft, name: draft.name || 'Combo' }} /></span>
                  <Input label="Combo name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Exam Night Survival Pack" className="flex-1" />
                </div>
                {!items.length ? (
                  <EmptyState emoji="🎁" title="Tap items to add them" className="py-6" />
                ) : (
                  <ul className="divide-y divide-line/50 rounded-2xl border border-line/60">
                    {items.map((i) => {
                      const p = byId.get(i.productId);
                      if (!p) return null;
                      return (
                        <li key={i.productId} className="flex items-center gap-2 p-2">
                          <span className="h-9 w-9 shrink-0 rounded-lg p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>
                          <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                          <IconButton label={`Remove one ${p.name}`} onClick={() => dec(p.id)} className="h-8 w-8"><Minus className="h-3.5 w-3.5" /></IconButton>
                          <span className="w-5 text-center text-sm font-bold">{i.qty}</span>
                          <IconButton label={`Add one ${p.name}`} onClick={() => add(p.id)} className="h-8 w-8"><Plus className="h-3.5 w-3.5" /></IconButton>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <div className="rounded-2xl bg-surface2/60 p-3 text-sm">
                  <p className="flex justify-between"><span className="text-muted">Bought separately</span><span className="price">{inr(sumPrice)}</span></p>
                  <p className="flex justify-between"><span className="text-muted">Your cost</span><span className="price">{inr(sumCost)}</span></p>
                  <p className="flex justify-between"><span className="text-muted">Can make</span><span>{maxStock} combos from stock</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Combo price (₹)" type="number" inputMode="numeric" value={String(draft.price)} onChange={(e) => setDraft({ ...draft, price: Math.max(0, Number(e.target.value)) })} />
                  <Input label="Combo stock" type="number" inputMode="numeric" value={String(draft.stock)} onChange={(e) => setDraft({ ...draft, stock: Math.max(0, Math.round(Number(e.target.value))) })} hint={`Max ${maxStock}`} />
                </div>
                {items.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[13px]">
                    <Badge tone={sumPrice - draft.price > 0 ? 'lime' : 'pink'}>Customer saves {inr(Math.max(0, sumPrice - draft.price))}</Badge>
                    <Badge tone={margin(draft) >= 10 ? 'violet' : 'amber'}>Margin {margin(draft)}%</Badge>
                  </div>
                )}
                <Textarea label="Description" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Everything you need for a 3 AM study sprint" />
                <Button variant="primary" block loading={saving} onClick={save}>Save combo</Button>
              </div>
            </Panel>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {!combos.length ? (
              <EmptyState emoji="🎁" title="No combos yet" action={<Button variant="primary" onClick={() => start()}>Build one</Button>} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {combos.map((c) => {
                  const sep = (c.comboItems ?? []).reduce((a, i) => a + (byId.get(i.productId)?.price ?? 0) * i.qty, 0);
                  return (
                    <Panel key={c.id} className={cn(!c.active && 'opacity-60')}>
                      <div className="flex items-start gap-3">
                        <span className="h-16 w-16 shrink-0 rounded-2xl p-1.5" style={{ background: `${c.color}33` }}><PackShot product={c} /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold leading-tight">{c.name}</p>
                          <p className="price mt-1 text-sm"><b>{inr(c.price)}</b> <span className="text-muted line-through">{inr(sep)}</span></p>
                          <p className="text-[12px] text-muted">{c.stock} in stock · {margin(c)}% margin</p>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-[13px] text-muted">{(c.comboItems ?? []).map((i) => `${i.qty}× ${byId.get(i.productId)?.name ?? '?'}`).join(', ')}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" block icon={<Pencil className="h-4 w-4" />} onClick={() => start(c)}>Edit</Button>
                        <IconButton label={`Delete ${c.name}`} onClick={() => remove(c)}><Trash2 className="h-4 w-4 text-pink" /></IconButton>
                      </div>
                    </Panel>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
