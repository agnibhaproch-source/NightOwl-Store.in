import { useState } from 'react';
import { QrCode } from 'lucide-react';
import { inr } from '@/shared/lib/format';
import { APP } from '@/shared/config/app';

export function UpiQr({ amount }: { amount: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-violet/40 bg-violet/5 p-5 text-center">
      <div className="grid h-56 w-56 place-items-center overflow-hidden rounded-2xl bg-surface">
        {broken ? (
          <div className="flex flex-col items-center gap-2 p-4 text-muted">
            <QrCode className="h-12 w-12" />
            <p className="text-[12px] leading-snug">
              Add your GPay QR image at <code className="rounded bg-surface2 px-1 py-0.5">public/qr-code.jpg</code>
            </p>
          </div>
        ) : (
          <img src="/qr-code.jpg" alt="Scan to pay with GPay" className="h-full w-full object-contain" onError={() => setBroken(true)} />
        )}
      </div>
      <div>
        <p className="font-display text-2xl font-extrabold">{inr(amount)}</p>
        <p className="text-sm font-semibold">{APP.upiPayeeName}</p>
        <p className="text-[12px] text-muted">UPI ID: {APP.upiId}</p>
      </div>
    </div>
  );
}
