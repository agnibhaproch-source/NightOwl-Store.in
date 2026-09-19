import { Info } from 'lucide-react';
import type { Bill, StoreSettings } from '@/shared/types';
import { inr } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';

function Row({ label, value, hint, strike, tone }: { label: string; value: string; hint?: string; strike?: string; tone?: 'lime' }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[14px]">
      <span className="text-muted">
        {label}
        {hint && <span className="block text-[12px] text-muted/80">{hint}</span>}
      </span>
      <span className={cn('price shrink-0 font-medium', tone === 'lime' && 'text-lime')}>
        {strike && <span className="mr-1.5 text-[12px] text-muted line-through">{strike}</span>}
        {value}
      </span>
    </div>
  );
}

export function BillSummary({ bill, compact }: { bill: Bill; settings?: StoreSettings; compact?: boolean }) {
  const saved = bill.productDiscount + bill.couponDiscount;
  return (
    <div>
      <Row label="Item total" value={inr(bill.itemTotal)} strike={bill.mrpTotal > bill.itemTotal ? inr(bill.mrpTotal) : undefined} />
      {bill.couponDiscount > 0 && <Row label={`Coupon ${bill.couponCode ?? ''}`} value={`−${inr(bill.couponDiscount)}`} tone="lime" />}
      <Row label="Delivery fee" value={inr(bill.deliveryFee)} />
      <Row label="Platform fee" value={inr(bill.convenienceFee)} />
      {!!bill.donation && <Row label="Feeding India 💛" value={inr(bill.donation)} hint="Thank you for feeding a child" tone="lime" />}
      <div className="my-2 border-t border-dashed border-line" />
      <div className="flex items-center justify-between py-1">
        <span className="font-bold">To pay</span>
        <span className="price font-display text-xl font-extrabold">{inr(bill.grandTotal)}</span>
      </div>
      {!compact && saved > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-lime/10 px-3 py-2 text-[13px] font-semibold text-lime">
          <Info className="h-4 w-4" /> You're saving {inr(saved)} on this order
        </p>
      )}
    </div>
  );
}
