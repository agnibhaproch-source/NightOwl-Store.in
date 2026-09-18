import { Ban, Download, MessageSquareText, Phone, Printer, Star, User } from 'lucide-react';
import { Badge, Button, Drawer, PackShot, Stars } from '@/shared/ui';
import { useOrders, useProducts, useSettings } from '@/shared/hooks/live';
import { fmtDateTime, fmtTime, inr, timeAgo } from '@/shared/lib/format';
import { STATUS_LABEL, type OrderStatus } from '@/shared/types';
import { cn } from '@/shared/lib/cn';
import { useAdminUi } from '../store/ui';
import { NEXT_LABEL, downloadSlip, moveOrder, nextStatus, printSlip, rejectOrder } from './orderActions';

export const STATUS_TONE: Record<OrderStatus, 'amber' | 'violet' | 'cyan' | 'lime' | 'pink'> = {
  placed: 'amber',
  accepted: 'violet',
  packing: 'violet',
  out_for_delivery: 'cyan',
  delivered: 'lime',
  cancelled: 'pink'
};

const DOT: Record<OrderStatus, string> = {
  placed: 'bg-amber', accepted: 'bg-violet', packing: 'bg-violet', out_for_delivery: 'bg-cyan', delivered: 'bg-lime', cancelled: 'bg-pink'
};

export function OrderDrawer() {
  const id = useAdminUi((s) => s.orderId);
  const close = () => useAdminUi.getState().openOrder(null);
  const [orders] = useOrders();
  const [products] = useProducts();
  const [settings] = useSettings();
  const o = orders.find((x) => x.id === id);
  const byId = new Map(products.map((p) => [p.id, p]));
  const hostel = o && settings.hostels.find((h) => h.id === o.address.hostelId);
  const next = o && nextStatus(o.status);
  const live = o && o.status !== 'delivered' && o.status !== 'cancelled';

  return (
    <Drawer
      open={!!id}
      onClose={close}
      title={
        o ? (
          <span className="flex items-center gap-2">
            #{o.id}
            <span className="rounded-md bg-violet/15 px-1.5 py-0.5 font-display text-[13px] font-extrabold tracking-[0.15em] text-violet">{o.shortCode}</span>
            <Badge tone={STATUS_TONE[o.status]}>{STATUS_LABEL[o.status]}</Badge>
          </span>
        ) : 'Order'
      }
      footer={
        o && live ? (
          <div className="flex gap-2">
            <Button variant="outline" icon={<Ban className="h-4 w-4" />} onClick={() => rejectOrder(o)} className="text-pink">
              {o.status === 'placed' ? 'Reject' : 'Cancel'}
            </Button>
            {next && (
              <Button variant="primary" block onClick={() => moveOrder(o, next)}>
                {NEXT_LABEL[o.status]}
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      {!o ? (
        <p className="text-muted">This order no longer exists.</p>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl bg-surface2/60 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet/15 text-violet"><User className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{o.customerName}</p>
                <p className="text-sm text-muted">+91 {o.phone}</p>
              </div>
              <a href={`tel:+91${o.phone}`} className="grid h-10 w-10 place-items-center rounded-xl border border-line hover:bg-surface2" aria-label={`Call ${o.customerName}`}>
                <Phone className="h-4 w-4" />
              </a>
            </div>
            <div className="mt-3 rounded-xl bg-surface p-3">
              <p className="font-display text-2xl font-extrabold leading-tight">{hostel?.short} · {o.address.block}-{o.address.room}</p>
              <p className="text-[13px] text-muted">{hostel?.name}, Block {o.address.block}, Room {o.address.room}</p>
            </div>
            {o.instructions && (
              <p className="mt-3 flex gap-2 rounded-xl border border-amber/40 bg-amber/10 p-3 text-sm">
                <MessageSquareText className="h-4 w-4 shrink-0 text-amber" /> {o.instructions}
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">
              Pack list · {o.items.reduce((a, i) => a + i.qty, 0)} items
            </h3>
            <ul className="divide-y divide-line/50 rounded-2xl border border-line/60">
              {o.items.map((i) => {
                const p = byId.get(i.productId);
                return (
                  <li key={i.productId} className="flex items-center gap-3 p-2.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent font-display text-lg font-extrabold text-onaccent">{i.qty}</span>
                    {p && <span className="h-10 w-10 shrink-0 rounded-lg p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{i.name}</span>
                      <span className="text-[12px] text-muted">{i.unit} · {inr(i.price)} each</span>
                    </span>
                    <span className="price text-sm font-bold">{inr(i.price * i.qty)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-line/60 p-4 text-sm">
            {[
              ['Items', inr(o.bill.itemTotal)],
              o.bill.couponDiscount ? [`Coupon ${o.bill.couponCode}`, `−${inr(o.bill.couponDiscount)}`] : null,
              ['Delivery', inr(o.bill.deliveryFee)],
              ['Platform fee', inr(o.bill.convenienceFee)]
            ]
              .filter((r): r is string[] => !!r)
              .map(([k, v]) => (
                <p key={k} className="flex justify-between py-0.5"><span className="text-muted">{k}</span><span className="price">{v}</span></p>
              ))}
            <p className="mt-2 flex justify-between border-t border-dashed border-line pt-2 text-base font-bold">
              <span>Paid via UPI</span><span className="price">{inr(o.bill.grandTotal)}</span>
            </p>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Button icon={<Printer className="h-4 w-4" />} onClick={() => printSlip(o, settings)}>Print slip</Button>
            <Button icon={<Download className="h-4 w-4" />} onClick={() => downloadSlip(o, settings)}>Download</Button>
          </div>

          <section>
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted">Timeline</h3>
            <ol className="space-y-2 border-l-2 border-line pl-4">
              {o.history.map((h) => (
                <li key={h.status + h.at} className="relative text-sm">
                  <span className={cn('absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-surface', DOT[h.status])} />
                  <b>{STATUS_LABEL[h.status]}</b> <span className="text-muted">· {fmtTime(h.at)} · {timeAgo(h.at)}</span>
                </li>
              ))}
            </ol>
            {o.cancelReason && <p className="mt-2 text-sm text-pink">Reason: {o.cancelReason} ({o.cancelledBy === 'user' ? 'by customer' : 'by store'})</p>}
          </section>

          {o.rating && (
            <section className="rounded-2xl bg-surface2/60 p-4">
              <p className="flex items-center gap-2 font-bold"><Star className="h-4 w-4 text-amber" /> Customer rating</p>
              <Stars value={o.rating.order} size={18} />
              {o.rating.comment && <p className="mt-1 text-sm text-muted">“{o.rating.comment}”</p>}
            </section>
          )}
          <p className="text-center text-[12px] text-muted">Placed {fmtDateTime(o.createdAt)} · Paid via UPI</p>
        </div>
      )}
    </Drawer>
  );
}
