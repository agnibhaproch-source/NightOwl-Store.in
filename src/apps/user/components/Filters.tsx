import { useMemo, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { Category, Product } from '@/shared/types';
import { Button, Sheet, Switch } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { inr } from '@/shared/lib/format';

export type SortKey = 'relevance' | 'popular' | 'price_asc' | 'price_desc' | 'new' | 'discount';

export interface FilterState {
  sort: SortKey;
  maxPrice: number | null;
  cats: string[];
  brands: string[];
  vegOnly: boolean;
  inStock: boolean;
}

export const emptyFilters = (sort: SortKey = 'popular'): FilterState => ({
  sort, maxPrice: null, cats: [], brands: [], vegOnly: false, inStock: false
});

export const SORT_LABEL: Record<SortKey, string> = {
  relevance: 'Relevance',
  popular: 'Popular',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  new: 'Newest',
  discount: 'Biggest discount'
};

export function activeFilterCount(f: FilterState) {
  return (f.maxPrice != null ? 1 : 0) + f.cats.length + f.brands.length + (f.vegOnly ? 1 : 0) + (f.inStock ? 1 : 0);
}

export function applyFilters(list: Product[], f: FilterState) {
  let out = list.filter(
    (p) =>
      (f.maxPrice == null || p.price <= f.maxPrice) &&
      (!f.cats.length || f.cats.includes(p.categoryId)) &&
      (!f.brands.length || f.brands.includes(p.brand)) &&
      (!f.vegOnly || p.veg) &&
      (!f.inStock || p.stock > 0)
  );
  const cmp: Partial<Record<SortKey, (a: Product, b: Product) => number>> = {
    popular: (a, b) => b.popularity - a.popularity,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    new: (a, b) => b.createdAt - a.createdAt,
    discount: (a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp
  };
  const fn = cmp[f.sort];
  if (fn) out = [...out].sort(fn);
  // Out-of-stock items sink to the bottom, keeping sort order otherwise.
  return [...out.filter((p) => p.stock > 0), ...out.filter((p) => p.stock <= 0)];
}

const PRICE_STEPS = [20, 30, 50, 100, 200];

export function FilterSheet({
  open, onClose, value, onApply, products, categories, showCategories = true, sorts
}: {
  open: boolean;
  onClose: () => void;
  value: FilterState;
  onApply: (f: FilterState) => void;
  products: Product[];
  categories: Category[];
  showCategories?: boolean;
  sorts: SortKey[];
}) {
  const [f, setF] = useState(value);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setF(value);
  }
  const brands = useMemo(() => {
    const scoped = f.cats.length ? products.filter((p) => f.cats.includes(p.categoryId)) : products;
    const m = new Map<string, number>();
    scoped.forEach((p) => m.set(p.brand, (m.get(p.brand) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [products, f.cats]);
  const preview = applyFilters(products, f).length;
  const toggle = (k: 'cats' | 'brands', v: string) =>
    setF((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Sort & filter"
      footer={
        <div className="flex gap-2">
          <Button onClick={() => setF(emptyFilters(f.sort))}>Clear</Button>
          <Button variant="primary" block onClick={() => { onApply(f); onClose(); }}>
            Show {preview} item{preview === 1 ? '' : 's'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6 pb-2">
        <fieldset>
          <legend className="field-label">Sort by</legend>
          <div className="flex flex-wrap gap-2">
            {sorts.map((s) => (
              <button key={s} type="button" aria-pressed={f.sort === s} onClick={() => setF({ ...f, sort: s })} className="chip">
                {SORT_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="field-label">Price</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={f.maxPrice == null} onClick={() => setF({ ...f, maxPrice: null })} className="chip">Any</button>
            {PRICE_STEPS.map((p) => (
              <button key={p} type="button" aria-pressed={f.maxPrice === p} onClick={() => setF({ ...f, maxPrice: p })} className="chip">
                Under {inr(p)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-3 rounded-2xl bg-surface2/60 p-4">
          <Switch label="Veg only" checked={f.vegOnly} onChange={(v) => setF({ ...f, vegOnly: v })} />
          <Switch label="Hide out of stock" checked={f.inStock} onChange={(v) => setF({ ...f, inStock: v })} />
        </div>
        {showCategories && (
          <fieldset>
            <legend className="field-label">Category</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={f.cats.includes(c.id)} onClick={() => toggle('cats', c.id)} className="chip">
                  <span aria-hidden>{c.emoji}</span> {c.name}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset>
          <legend className="field-label">Brand</legend>
          <div className="flex flex-wrap gap-2">
            {brands.map(([b, n]) => (
              <button key={b} type="button" aria-pressed={f.brands.includes(b)} onClick={() => toggle('brands', b)} className="chip">
                {b} <span className="text-[11px] opacity-60">{n}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Sheet>
  );
}

export function FilterButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('chip relative', count > 0 && 'border-violet text-violet', className)} aria-label={`Sort and filter${count ? `, ${count} active` : ''}`}>
      <SlidersHorizontal className="h-4 w-4" /> Filters
      {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-violet px-1 text-[11px] font-bold text-white">{count}</span>}
    </button>
  );
}
