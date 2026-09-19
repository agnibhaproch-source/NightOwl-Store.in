import { useMemo, useState } from 'react';
import { ChevronRight, RotateCcw, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserOrders } from '@/shared/hooks/live';
import { Button, EmptyState, Segmented, Skeleton, Reveal, RevealItem, PackShot } from '@/shared/ui';
import { fmtDateTime, inr } from '@/shared/lib/format';
import type { Order } from '@/shared/types';
import { useCatalog, useCurrentUser } from '../hooks';
import { Page, PageHeader } from '../components/Page';
import { RateSheet, StatusBadge, useReorder } from '../components/OrderBits';
import { LoginPrompt } from '../components/LoginPrompt';

type F = 'all' | 'active' | 'delivered' | 'cancelled';
const isActive = (o: Order) => o.status !== 'delivered' && o.status !== 'cancelled';

function OrderCard({ o, onRate }: { o: Order; onRate: (o: Order) => void }) {
  const { byId } = useCatalog();
  const reorder = useReorder();
  const nav = useNavigate();
  const qty = o.items.reduce((a, i) => a + i.qty, 0);
  return (
    <article className="card overflow-hidden">
      <Link to={`/orders/${o.id}`} className="block p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusBadge status={o.status} />
          <span className="text-[12px] text-muted">{fmtDateTime(o.createdAt)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex -space-x-3">
            {o.items.slice(0, 4).map((i) => {
              const p = byId.get(i.productId);
              return (
                <span key={i.productId} className="h-12 w-12 rounded-xl border-2 border-surface bg-surface2 p-1" style={p ? { background: `${p.color}33` } : undefined}>
                  {p && <PackShot product={p} />}
                </span>
              );
            })}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
            <p className="text-[13px] text-muted">#{o.id} · {qty} item{qty > 1 ? 's' : ''} · <span className="price font-semibold text-fg">{inr(o.bill.grandTotal)}</span></p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
        </div>
      </Link>
      {!isActive(o) && (
        <div className="flex border-t border-line/50">
          <button onClick={() => reorder(o) && nav('/cart')} className="hit flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-semibold text-violet hover:bg-surface2">
            <RotateCcw className="h-4 w-4" /> Reorder
          </button>
          {o.status === 'delivered' && (
            <button onClick={() => onRate(o)} className="hit flex flex-1 items-center justify-center gap-1.5 border-l border-line/50 py-3 text-sm font-semibold hover:bg-surface2">
              <Star className={o.rating ? 'h-4 w-4 fill-amber text-amber' : 'h-4 w-4'} />
              {o.rating ? `Rated ${o.rating.order}★` : 'Rate order'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function Orders() {
  const { userId } = useCurrentUser();
  const [orders, loading] = useUserOrders(userId);
  const [filter, setFilter] = useState<F>('all');
  const [rating, setRating] = useState<Order | null>(null);
  const nav = useNavigate();

  const sorted = useMemo(
    () => orders.filter((o) => o.cancelReason !== 'Payment not completed').sort((a, b) => b.createdAt - a.createdAt),
    [orders]
  );
  const counts = {
    all: sorted.length,
    active: sorted.filter(isActive).length,
    delivered: sorted.filter((o) => o.status === 'delivered').length,
    cancelled: sorted.filter((o) => o.status === 'cancelled').length
  };
  const list = sorted.filter((o) => filter === 'all' || (filter === 'active' ? isActive(o) : o.status === filter));
  const live = rating ? orders.find((o) => o.id === rating.id) ?? rating : null;

  if (!userId)
    return (
      <Page>
        <PageHeader title="Your orders" back={false} />
        <LoginPrompt emoji="📦" title="Your order history lives here" body="Log in to track live orders and reorder favourites in one tap." />
      </Page>
    );

  return (
    <Page>
      <PageHeader title="Your orders" back={false} />
      <Segmented
        label="Filter orders"
        value={filter}
        onChange={setFilter}
        className="mb-4"
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'active', label: 'Active', count: counts.active },
          { value: 'delivered', label: 'Delivered', count: counts.delivered },
          { value: 'cancelled', label: 'Cancelled', count: counts.cancelled }
        ]}
      />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-card" />)}</div>
      ) : !list.length ? (
        <EmptyState
          emoji={filter === 'active' ? '😴' : '🧾'}
          title={filter === 'all' ? 'No orders yet' : `No ${filter} orders`}
          body={filter === 'all' ? 'Your first midnight snack run is a tap away.' : 'Nothing to show under this filter.'}
          action={<Button variant="primary" onClick={() => nav('/')}>Browse snacks</Button>}
        />
      ) : (
        <Reveal className="space-y-3" key={filter}>
          {list.map((o) => (
            <RevealItem key={o.id}>
              <OrderCard o={o} onRate={setRating} />
            </RevealItem>
          ))}
        </Reveal>
      )}
      {live && <RateSheet key={live.id} order={live} open={!!rating} onClose={() => setRating(null)} />}
    </Page>
  );
}
