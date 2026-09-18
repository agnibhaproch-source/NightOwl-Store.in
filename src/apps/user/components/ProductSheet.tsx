import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus } from 'lucide-react';
import { AddStepper, Badge, Button, PackShot, Sheet } from '@/shared/ui';
import { discountPct, inr } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useOrders } from '@/shared/hooks/live';
import { useCart } from '../store/cart';
import { useSession } from '../store/session';
import { useUi } from '../store/ui';
import { useAddToCart, useCatalog } from '../hooks';
import { ProductCard, StockBadge, useNotifyMe } from './ProductCard';
import type { Product } from '@/shared/types';

function NotifyMeLarge({ p }: { p: Product }) {
  const { on, toggle } = useNotifyMe(p);
  return (
    <Button variant={on ? 'secondary' : 'violet'} size="lg" block onClick={toggle}>
      {on ? "You'll get an alert" : 'Notify me when it’s back'}
    </Button>
  );
}

export function ProductSheet() {
  const id = useUi((s) => s.sheetProductId);
  const close = useUi((s) => s.openProduct);
  const { byId, products } = useCatalog();
  const [orders] = useOrders();
  const p = id ? byId.get(id) : undefined;
  const qty = useCart((s) => (id ? s.lines[id] ?? 0 : 0));
  const dec = useCart((s) => s.dec);
  const fav = useSession((s) => (id ? s.favorites.includes(id) : false));
  const toggleFav = useSession((s) => s.toggleFavorite);
  const addToCart = useAddToCart();

  const { related, together } = useMemo(() => {
    if (!p) return { related: [], together: [] };
    const related = products.filter((x) => x.id !== p.id && x.categoryId === p.categoryId && x.stock > 0).slice(0, 8);
    const counts = new Map<string, number>();
    for (const o of orders) {
      if (!o.items.some((i) => i.productId === p.id)) continue;
      for (const i of o.items) if (i.productId !== p.id) counts.set(i.productId, (counts.get(i.productId) ?? 0) + 1);
    }
    const together = [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([pid]) => products.find((x) => x.id === pid))
      .filter((x): x is Product => !!x && x.stock > 0 && x.categoryId !== p.categoryId)
      .slice(0, 3);
    return { related, together };
  }, [p, products, orders]);

  const comboParts = p?.comboItems?.map((c) => ({ ...c, product: byId.get(c.productId) })).filter((c) => c.product) ?? [];
  const off = p ? discountPct(p.mrp, p.price) : 0;
  const togetherTotal = together.reduce((a, x) => a + x.price, 0);

  return (
    <Sheet open={!!p} onClose={() => close(null)} size="lg" label={p?.name ?? 'Product'} hideHeader
      footer={p && (
        <div className="flex items-center gap-3">
          <div className="price flex-1">
            <div className="text-xl font-extrabold">{inr(p.price)}</div>
            {p.mrp > p.price && <div className="text-xs text-muted">MRP <span className="line-through">{inr(p.mrp)}</span> incl. of all taxes</div>}
          </div>
          {p.stock > 0 ? (
            <div data-fly-src className="flex items-center">
              <span data-fly-img className="sr-only" />
              <AddStepper qty={qty} name={p.name} atMax={qty >= p.stock}
                onAdd={(e) => addToCart(p, e)} onInc={(e) => addToCart(p, e)} onDec={() => dec(p.id)} className="min-w-[110px] justify-center" />
            </div>
          ) : (
            <div className="w-56"><NotifyMeLarge p={p} /></div>
          )}
        </div>
      )}
    >
      {p && (
        <div className="pt-2">
          <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[24px]" style={{ background: `radial-gradient(circle at 50% 60%, ${p.color}40, ${p.color}08 70%)` }}>
            <motion.div initial={{ scale: 0.85, rotate: -6, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 18 }} className="mx-auto h-full w-3/5 py-4">
              <PackShot product={p} />
            </motion.div>
            <button
              type="button"
              onClick={() => toggleFav(p.id)}
              aria-pressed={fav}
              aria-label={fav ? 'Remove from favourites' : 'Save to favourites'}
              className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-bg/60 backdrop-blur"
            >
              <Heart className={cn('h-5 w-5', fav ? 'fill-pink text-pink' : '')} />
            </button>
            {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-violet px-2.5 py-1 text-xs font-bold text-white">{off}% off</span>}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{p.brand}</Badge>
            <Badge tone={p.veg ? 'lime' : 'pink'}>{p.veg ? 'Veg' : 'Non-veg'}</Badge>
            <StockBadge p={p} />
          </div>
          <h2 className="mt-2 text-2xl font-extrabold">{p.name}</h2>
          <p className="text-muted">{p.unit}</p>
          <p className="mt-3 text-[15px]">{p.description}</p>

          {comboParts.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-lg font-bold">What’s inside</h3>
              <ul className="divide-y divide-line/60 rounded-2xl border border-line/60">
                {comboParts.map((c) => (
                  <li key={c.productId} className="flex items-center gap-3 p-2.5">
                    <div className="h-11 w-11 shrink-0 rounded-xl p-1" style={{ background: `${c.product!.color}22` }}><PackShot product={c.product!} /></div>
                    <span className="min-w-0 flex-1 text-sm font-medium">{c.product!.name}</span>
                    <span className="text-sm text-muted">× {c.qty}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-lime">You save {inr(p.mrp - p.price)} compared to buying these separately.</p>
            </div>
          )}

          {together.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-bold">Frequently bought together</h3>
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-line/60 p-3">
                <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
                  {[p, ...together].map((x, i) => (
                    <div key={x.id} className="flex items-center gap-1.5">
                      {i > 0 && <Plus className="h-3.5 w-3.5 shrink-0 text-muted" />}
                      <div className="h-12 w-12 shrink-0 rounded-xl p-1" style={{ background: `${x.color}22` }} title={x.name}><PackShot product={x} /></div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => together.forEach((x) => addToCart(x, e))}
                  aria-label={`Add ${together.length} suggested items for ${inr(togetherTotal)}`}
                >
                  Add all {inr(togetherTotal)}
                </Button>
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-lg font-bold">More like this</h3>
              <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
                {related.map((x) => <ProductCard key={x.id} p={x} variant="rail" />)}
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
