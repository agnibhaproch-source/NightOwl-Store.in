import { services, errorMessage } from '@/shared/services';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import { STATUS_FLOW, STATUS_LABEL, isPaid, type Order, type OrderStatus, type StoreSettings } from '@/shared/types';
import { fmtDateTime, inr } from '@/shared/lib/format';
import { downloadFile } from '@/shared/lib/files';
import { APP } from '@/shared/config/app';

export const nextStatus = (s: OrderStatus): OrderStatus | null => {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1]! : null;
};

export const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  placed: 'Accept',
  accepted: 'Start packing',
  packing: 'Send out',
  out_for_delivery: 'Mark delivered'
};

export const REJECT_REASONS = [
  'Item went out of stock',
  'Store is closing',
  'Rider not available',
  'Address not serviceable',
  'Suspected fake order'
];

/** True while the customer's UPI payment hasn't been confirmed by the store. */
export const awaitingPayment = (o: Order) => o.status === 'placed' && !isPaid(o);

export async function markPaid(o: Order) {
  const { ok } = await confirmDialog({
    title: `Confirm payment for ${o.shortCode}?`,
    body: `Only confirm if ${inr(o.bill.grandTotal)} from ${o.customerName} is already in your GPay/bank account. This unlocks the order and notifies the customer.`,
    confirmLabel: 'Yes, money received'
  });
  if (!ok) return;
  try {
    await services.orders.confirmPayment(o.id);
    toast({ title: `#${o.id} marked paid`, body: 'The customer was notified.', emoji: '💰', duration: 2500 });
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

export async function moveOrder(o: Order, to: OrderStatus) {
  if (o.status === to) return;
  if (to === 'cancelled') return rejectOrder(o);
  if (!isPaid(o)) {
    toast.error('Confirm the payment first', 'Nothing moves forward until the money is in.');
    return;
  }
  if (to === 'out_for_delivery' && !o.riderId) {
    const { ok } = await confirmDialog({ title: 'No rider assigned', body: 'Nobody is set to deliver this order. Send it out anyway?', confirmLabel: 'Send out anyway' });
    if (!ok) return;
  }
  if (to === 'delivered' && o.riderId) {
    const { ok } = await confirmDialog({ title: `Mark delivered without ${o.rider?.name ?? 'the rider'}?`, body: 'The rider normally completes this with the customer’s delivery code. Only do it yourself if the rider can’t.', confirmLabel: 'Mark delivered' });
    if (!ok) return;
  }
  const from = STATUS_FLOW.indexOf(o.status);
  const dest = STATUS_FLOW.indexOf(to);
  if (dest < from) {
    toast.error('Orders can’t move backwards');
    return;
  }
  try {
    await services.orders.updateStatus(o.id, to);
    toast({ title: `#${o.id} → ${STATUS_LABEL[to]}`, emoji: to === 'delivered' ? '🎉' : '✅', duration: 2000 });
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

export async function rejectOrder(o: Order) {
  const { ok, value } = await confirmDialog({
    title: o.status === 'placed' ? `Reject #${o.id}?` : `Cancel #${o.id}?`,
    body: `${o.customerName} will be notified with the reason. Stock is returned to inventory.`,
    confirmLabel: o.status === 'placed' ? 'Reject order' : 'Cancel order',
    tone: 'danger',
    input: { label: 'Reason', options: REJECT_REASONS, required: true, placeholder: 'Tell the customer why' }
  });
  if (!ok) return;
  try {
    await services.orders.updateStatus(o.id, 'cancelled', value.trim());
    toast({ title: `#${o.id} cancelled`, emoji: '🛑' });
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

function hostelLabel(o: Order, s: StoreSettings) {
  const h = s.hostels.find((x) => x.id === o.address.hostelId);
  return `${h?.name ?? 'Hostel'} (${h?.short ?? ''}) · Block ${o.address.block} · Room ${o.address.room}`;
}

export function slipText(o: Order, s: StoreSettings) {
  const line = '-'.repeat(38);
  const rows = o.items.map((i) => `${String(i.qty).padStart(2)} x ${i.name.slice(0, 24).padEnd(24)} ${inr(i.price * i.qty).padStart(6)}`);
  const b = o.bill;
  return [
    `${APP.name.toUpperCase()} PACKING SLIP`,
    line,
    `Order   #${o.id}  code ${o.shortCode}`,
    `Placed  ${fmtDateTime(o.createdAt)}`,
    `Name    ${o.customerName}`,
    `Phone   +91 ${o.phone}`,
    o.receiver ? `Receiver ${o.receiver.name} +91 ${o.receiver.phone}` : '',
    `Deliver ${hostelLabel(o, s)}`,
    o.instructions ? `Note    ${o.instructions}` : '',
    line,
    ...rows,
    line,
    `Items total      ${inr(b.itemTotal).padStart(8)}`,
    b.couponDiscount ? `Coupon ${(b.couponCode ?? '').padEnd(9)} -${inr(b.couponDiscount).padStart(7)}` : '',
    `Delivery         ${inr(b.deliveryFee).padStart(8)}`,
    `Platform fee     ${inr(b.convenienceFee).padStart(8)}`,
    b.donation ? `Feeding India     ${inr(b.donation).padStart(8)}` : '',
    `${isPaid(o) ? (o.paymentMode === 'wallet' ? 'PAID (WALLET)   ' : 'PAID (UPI)      ') : 'UNPAID (UPI)    '} ${inr(b.grandTotal).padStart(8)}`,
    line,
    '[ ] Items checked   [ ] Seal intact'
  ]
    .filter(Boolean)
    .join('\n');
}

export function downloadSlip(o: Order, s: StoreSettings) {
  downloadFile(`packing-slip-${o.id}.txt`, slipText(o, s));
}

export function printSlip(o: Order, s: StoreSettings) {
  const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  const w = window.open('', '_blank', 'width=420,height=640');
  if (!w) {
    toast.error('Pop-up blocked', 'Allow pop-ups to print, or download the slip instead.');
    return;
  }
  w.document.write(`<!doctype html><html><head><title>Slip #${o.id}</title><style>
    body{font:13px/1.45 ui-monospace,Menlo,Consolas,monospace;margin:16px;color:#000}
    pre{white-space:pre-wrap;margin:0} h1{font:700 26px system-ui;margin:0 0 8px}
    @media print{@page{size:80mm auto;margin:4mm}}
  </style></head><body><h1>#${esc(o.id)}</h1><pre>${esc(slipText(o, s))}</pre>
  <script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script></body></html>`);
  w.document.close();
}
