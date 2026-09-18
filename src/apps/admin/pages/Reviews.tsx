import { useMemo, useState } from 'react';
import { MessageSquareQuote, Star } from 'lucide-react';
import { useOrders, useProducts } from '@/shared/hooks/live';
import { Badge, EmptyState, PackShot, Segmented, Stars } from '@/shared/ui';
import { fmtDateTime, initials, timeAgo } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useAdminUi } from '../store/ui';
import { PageTitle, Panel } from '../components/Layout';

type F = 'all' | 'praise' | 'issues' | 'comments';

export default function Reviews() {
  const [orders] = useOrders();
  const [products] = useProducts();
  const openOrder = useAdminUi((s) => s.openOrder);
  const [filter, setFilter] = useState<F>('all');

  const rated = useMemo(() => orders.filter((o) => o.rating).sort((a, b) => (b.rating!.at) - (a.rating!.at)), [orders]);
  const avg = rated.length ? rated.reduce((a, o) => a + o.rating!.order, 0) / rated.length : 0;
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, n: rated.filter((o) => o.rating!.order === s).length }));

  const items = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    rated.forEach((o) => Object.entries(o.rating!.items).forEach(([id, v]) => {
      if (!v) return;
      const cur = m.get(id) ?? { sum: 0, n: 0 };
      cur.sum += v;
      cur.n++;
      m.set(id, cur);
    }));
    return [...m.entries()]
      .map(([id, v]) => ({ product: products.find((p) => p.id === id), avg: v.sum / v.n, n: v.n }))
      .filter((x) => !!x.product)
      .sort((a, b) => b.avg - a.avg || b.n - a.n);
  }, [rated, products]);

  const list = rated.filter((o) => {
    const r = o.rating!;
    if (filter === 'praise') return r.order >= 4;
    if (filter === 'issues') return r.order <= 3;
    if (filter === 'comments') return !!r.comment;
    return true;
  });

  return (
    <>
      <PageTitle title="Ratings & reviews" sub={`${rated.length} of ${orders.filter((o) => o.status === 'delivered').length} delivered orders rated`} />
      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <Panel>
            <div className="flex items-end gap-4">
              <div>
                <p className="price font-display text-[52px] font-extrabold leading-none">{avg.toFixed(1)}</p>
                <Stars value={Math.round(avg)} size={18} />
                <p className="mt-1 text-[12px] text-muted">{rated.length} ratings</p>
              </div>
              <ul className="flex-1 space-y-1">
                {dist.map((d) => (
                  <li key={d.s} className="flex items-center gap-2 text-[12px]">
                    <span className="flex w-6 items-center gap-0.5 text-muted">{d.s}<Star className="h-3 w-3" /></span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                      <span className={cn('block h-full rounded-full', d.s >= 4 ? 'bg-lime' : d.s === 3 ? 'bg-amber' : 'bg-pink')} style={{ width: `${rated.length ? (d.n / rated.length) * 100 : 0}%` }} />
                    </span>
                    <span className="w-6 text-right text-muted">{d.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
          <Panel title="Item ratings" flush>
            {!items.length ? (
              <EmptyState emoji="⭐" title="No item ratings yet" className="py-6" />
            ) : (
              <ul className="max-h-[520px] divide-y divide-line/50 overflow-y-auto" data-lenis-prevent>
                {items.map((x) => (
                  <li key={x.product!.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="h-9 w-9 shrink-0 rounded-lg p-1" style={{ background: `${x.product!.color}22` }}><PackShot product={x.product!} /></span>
                    <span className="min-w-0 flex-1 truncate text-sm">{x.product!.name}</span>
                    <span className="flex items-center gap-1 text-sm font-semibold">{x.avg.toFixed(1)} <Star className="h-3.5 w-3.5 fill-amber text-amber" /></span>
                    <span className="w-8 text-right text-[12px] text-muted">{x.n}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div>
          <Segmented
            label="Filter reviews"
            className="mb-3"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: rated.length },
              { value: 'praise', label: '4–5 ★', count: rated.filter((o) => o.rating!.order >= 4).length },
              { value: 'issues', label: '1–3 ★', count: rated.filter((o) => o.rating!.order <= 3).length },
              { value: 'comments', label: 'With comments', count: rated.filter((o) => o.rating!.comment).length }
            ]}
          />
          {!list.length ? (
            <EmptyState emoji="💬" title="No reviews here" body="Ratings appear as customers rate their delivered orders." />
          ) : (
            <ul className="space-y-3">
              {list.map((o) => {
                const r = o.rating!;
                return (
                  <li key={o.id}>
                    <Panel className={cn(r.order <= 3 && 'border-pink/40')}>
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet/15 text-[12px] font-bold text-violet">{initials(o.customerName)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <b className="text-sm">{o.customerName}</b>
                            <Stars value={r.order} size={14} />
                            {r.order <= 3 && <Badge tone="pink">Needs attention</Badge>}
                            <span className="ml-auto text-[12px] text-muted" title={fmtDateTime(r.at)}>{timeAgo(r.at)}</span>
                          </div>
                          {r.comment ? (
                            <p className="mt-1.5 flex gap-2 text-[15px]"><MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted" /> {r.comment}</p>
                          ) : (
                            <p className="mt-1 text-sm text-muted">No comment left.</p>
                          )}
                          <button onClick={() => openOrder(o.id)} className="mt-2 text-[13px] font-semibold text-violet hover:underline">
                            Order #{o.id} · {o.items.length} items
                          </button>
                        </div>
                      </div>
                    </Panel>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
