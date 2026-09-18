import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Download, Eye, EyeOff, Minus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useCategories, useProducts, useStockAlerts } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, IconButton, PackShot, Segmented, Select, Skeleton, Switch } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { normalize } from '@/shared/lib/search';
import { inr } from '@/shared/lib/format';
import { toCSV, downloadFile } from '@/shared/lib/files';
import { cn } from '@/shared/lib/cn';
import type { Product } from '@/shared/types';
import { useIsOwner } from '../store/session';
import { useAdminUi } from '../store/ui';
import { PageTitle, Panel } from '../components/Layout';
import { margin } from '../components/ProductEditor';

type StockF = 'all' | 'low' | 'out' | 'hidden';
type Sort = 'name' | 'stock' | 'price' | 'margin' | 'popular';

function StockControl({ p }: { p: Product }) {
  const [draft, setDraft] = useState<string | null>(null);
  const low = p.stock <= p.lowStockAt;
  const adjust = async (d: number) => {
    try {
      await services.inventory.adjustStock(p.id, d);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  const commit = async () => {
    if (draft == null) return;
    const n = Math.max(0, Math.round(Number(draft)));
    setDraft(null);
    if (Number.isFinite(n) && n !== p.stock) await services.inventory.setStock(p.id, n);
  };
  return (
    <div className="inline-flex items-center gap-1">
      <button onClick={() => adjust(-1)} disabled={p.stock <= 0} aria-label={`Remove one ${p.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface2 disabled:opacity-40">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        aria-label={`Stock for ${p.name}`}
        inputMode="numeric"
        value={draft ?? String(p.stock)}
        onFocus={(e) => { setDraft(String(p.stock)); e.target.select(); }}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setDraft(null); }}
        className={cn(
          'price h-9 w-14 rounded-lg border bg-transparent text-center font-bold outline-none focus:border-violet',
          p.stock === 0 ? 'border-pink/60 text-pink' : low ? 'border-amber/60 text-amber' : 'border-line'
        )}
      />
      <button onClick={() => adjust(1)} aria-label={`Add one ${p.name}`} className="grid h-9 w-9 place-items-center rounded-lg border border-line hover:bg-surface2">
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => adjust(10)} aria-label={`Add ten ${p.name}`} className="hidden h-9 rounded-lg border border-line px-2 text-[12px] font-bold hover:bg-surface2 xl:block">+10</button>
    </div>
  );
}

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [products, loading] = useProducts();
  const [cats] = useCategories();
  const [alerts] = useStockAlerts();
  const owner = useIsOwner();
  const edit = useAdminUi((s) => s.editProduct);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sort, setSort] = useState<Sort>('name');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkQty, setBulkQty] = useState('20');
  const stockF = (params.get('filter') as StockF | null) ?? 'all';
  const setStockF = (f: StockF) => setParams(f === 'all' ? {} : { filter: f }, { replace: true });

  const catName = (id: string) => cats.find((c) => c.id === id);
  const waiting = useMemo(() => {
    const m = new Map<string, number>();
    alerts.forEach((a) => m.set(a.productId, (m.get(a.productId) ?? 0) + 1));
    return m;
  }, [alerts]);

  const counts = {
    all: products.length,
    low: products.filter((p) => p.active && p.stock > 0 && p.stock <= p.lowStockAt).length,
    out: products.filter((p) => p.stock === 0).length,
    hidden: products.filter((p) => !p.active).length
  };

  const list = useMemo(() => {
    const t = normalize(q);
    const out = products.filter((p) => {
      if (cat !== 'all' && p.categoryId !== cat) return false;
      if (stockF === 'low' && !(p.active && p.stock > 0 && p.stock <= p.lowStockAt)) return false;
      if (stockF === 'out' && p.stock !== 0) return false;
      if (stockF === 'hidden' && p.active) return false;
      if (t && !normalize(`${p.name} ${p.brand} ${p.tags.join(' ')}`).includes(t)) return false;
      return true;
    });
    const cmp: Record<Sort, (a: Product, b: Product) => number> = {
      name: (a, b) => a.name.localeCompare(b.name),
      stock: (a, b) => a.stock - b.stock,
      price: (a, b) => b.price - a.price,
      margin: (a, b) => margin(b) - margin(a),
      popular: (a, b) => b.popularity - a.popularity
    };
    return out.sort(cmp[sort]);
  }, [products, q, cat, stockF, sort]);

  const allSelected = list.length > 0 && list.every((p) => sel.has(p.id));
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(list.map((p) => p.id)));

  const bulk = async (mode: 'set' | 'add') => {
    const n = Math.max(0, Math.round(Number(bulkQty)));
    await services.inventory.bulkStock([...sel], mode, n);
    toast.success(`${mode === 'set' ? 'Set' : 'Added'} ${n} for ${sel.size} products`);
    setSel(new Set());
  };
  const bulkActive = async (active: boolean) => {
    await Promise.all([...sel].map((id) => services.products.setActive(id, active)));
    toast.success(`${sel.size} products ${active ? 'shown' : 'hidden'}`);
    setSel(new Set());
  };
  const bulkDelete = async () => {
    const { ok } = await confirmDialog({ title: `Delete ${sel.size} products?`, body: 'This can’t be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    await Promise.all([...sel].map((id) => services.products.deleteProduct(id)));
    toast({ title: `${sel.size} products deleted`, emoji: '🗑️' });
    setSel(new Set());
  };
  const duplicate = async (p: Product) => {
    const copy = await services.products.duplicateProduct(p.id);
    toast({ title: 'Duplicated', body: copy.name, emoji: '📄', action: { label: 'Edit', onClick: () => edit(copy.id) } });
  };
  const remove = async (p: Product) => {
    const { ok } = await confirmDialog({ title: `Delete ${p.name}?`, confirmLabel: 'Delete', tone: 'danger' });
    if (ok) {
      await services.products.deleteProduct(p.id);
      toast({ title: 'Deleted', emoji: '🗑️' });
    }
  };
  const exportCsv = () => {
    downloadFile(
      `nightowl-inventory-${new Date().toISOString().slice(0, 10)}.csv`,
      toCSV(list.map((p) => ({
        id: p.id, name: p.name, brand: p.brand, category: catName(p.categoryId)?.name ?? '', unit: p.unit,
        cost: p.cost, mrp: p.mrp, price: p.price, margin_pct: margin(p), stock: p.stock, low_stock_at: p.lowStockAt, active: p.active
      }))),
      'text/csv'
    );
  };

  const stockValue = products.reduce((a, p) => a + p.stock * p.cost, 0);

  return (
    <>
      <PageTitle
        title="Products & stock"
        sub={`${products.length} products · stock worth ${inr(stockValue)} at cost`}
        actions={
          <>
            <Button icon={<Download className="h-4 w-4" />} onClick={exportCsv}>Export</Button>
            <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => edit('new')}>Add product</Button>
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Segmented
          label="Stock filter"
          value={stockF}
          onChange={setStockF}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'low', label: 'Low', count: counts.low },
            { value: 'out', label: 'Out', count: counts.out },
            { value: 'hidden', label: 'Hidden', count: counts.hidden }
          ]}
        />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Search products</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="field pl-10" placeholder="Search name, brand or tag" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
          <option value="all">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Select>
        <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="w-44">
            <option value="name">Name A–Z</option>
            <option value="stock">Stock: lowest</option>
            <option value="price">Price: highest</option>
            <option value="margin">Margin: highest</option>
            <option value="popular">Popularity</option>
        </Select>
      </div>

      <AnimatePresence>
        {sel.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-violet/50 p-2.5 shadow-violet"
          >
            <IconButton label="Clear selection" onClick={() => setSel(new Set())}><X className="h-4 w-4" /></IconButton>
            <b className="mr-2 text-sm">{sel.size} selected</b>
            <input aria-label="Quantity" inputMode="numeric" value={bulkQty} onChange={(e) => setBulkQty(e.target.value.replace(/\D/g, ''))} className="field h-9 w-20 text-center" />
            <Button size="sm" onClick={() => bulk('add')}>Add stock</Button>
            <Button size="sm" onClick={() => bulk('set')}>Set stock</Button>
            <span className="mx-1 h-6 w-px bg-line" />
            <Button size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => bulkActive(true)}>Show</Button>
            <Button size="sm" icon={<EyeOff className="h-4 w-4" />} onClick={() => bulkActive(false)}>Hide</Button>
            {owner && <Button size="sm" variant="outline" className="text-pink" icon={<Trash2 className="h-4 w-4" />} onClick={bulkDelete}>Delete</Button>}
          </motion.div>
        )}
      </AnimatePresence>

      <Panel flush className="overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : !list.length ? (
          <EmptyState emoji="📦" title="No products match" body="Try another filter, or add a new product." action={<Button onClick={() => { setQ(''); setCat('all'); setStockF('all'); }}>Reset filters</Button>} />
        ) : (
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full min-w-[920px] text-sm">
              <thead className="text-left text-[12px] uppercase tracking-wider text-muted">
                <tr className="border-b border-line/60">
                  <th className="w-10 px-4 py-3"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[rgb(var(--violet))]" /></th>
                  <th className="px-2 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 text-right font-semibold">Cost</th>
                  <th className="px-3 py-3 text-right font-semibold">MRP / Price</th>
                  <th className="px-3 py-3 text-right font-semibold">Margin</th>
                  <th className="px-3 py-3 font-semibold">Stock</th>
                  <th className="px-3 py-3 font-semibold">Visible</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {list.map((p) => {
                  const m = margin(p);
                  const c = catName(p.categoryId);
                  const w = waiting.get(p.id);
                  return (
                    <tr key={p.id} className={cn('transition-colors hover:bg-surface2/40', sel.has(p.id) && 'bg-violet/5', !p.active && 'opacity-60')}>
                      <td className="px-4 py-2"><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-[rgb(var(--violet))]" /></td>
                      <td className="px-2 py-2">
                        <button onClick={() => edit(p.id)} className="flex items-center gap-3 text-left">
                          <span className="h-11 w-11 shrink-0 rounded-xl p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>
                          <span className="min-w-0">
                            <span className="block max-w-[260px] truncate font-semibold hover:underline">{p.name}</span>
                            <span className="text-[12px] text-muted">{p.brand} · {p.unit}{p.comboItems?.length ? ' · combo' : ''}</span>
                          </span>
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">{c ? `${c.emoji} ${c.name}` : '—'}</td>
                      <td className="price px-3 py-2 text-right text-muted">{inr(p.cost)}</td>
                      <td className="price whitespace-nowrap px-3 py-2 text-right">
                        {p.mrp > p.price && <span className="mr-1.5 text-[12px] text-muted line-through">{inr(p.mrp)}</span>}
                        <b>{inr(p.price)}</b>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn('price font-semibold', m >= 15 ? 'text-lime' : m > 0 ? 'text-amber' : 'text-pink')}>{m}%</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <StockControl p={p} />
                          {p.stock === 0 ? <Badge tone="pink">Out</Badge> : p.stock <= p.lowStockAt ? <Badge tone="amber">Low</Badge> : null}
                          {w ? <Badge tone="cyan">{w} waiting</Badge> : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Switch label={`Visible: ${p.name}`} hideLabel checked={p.active} onChange={(v) => services.products.setActive(p.id, v)} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        <IconButton label={`Edit ${p.name}`} onClick={() => edit(p.id)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label={`Duplicate ${p.name}`} onClick={() => duplicate(p)}><Copy className="h-4 w-4" /></IconButton>
                        {owner && <IconButton label={`Delete ${p.name}`} onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-pink" /></IconButton>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
