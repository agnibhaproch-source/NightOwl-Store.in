import { Bike, Check, Footprints, Phone } from 'lucide-react';
import { Sheet } from '@/shared/ui';
import { useOrders, useRiders } from '@/shared/hooks/live';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { cn } from '@/shared/lib/cn';
import { initials } from '@/shared/lib/format';
import { useAdminUi } from '../store/ui';

/** Pick which approved rider takes a paid, accepted order. Online riders with the lightest load come first. */
export function AssignRiderSheet() {
  const id = useAdminUi((s) => s.assignOrderId);
  const close = () => useAdminUi.getState().openAssign(null);
  const [orders] = useOrders();
  const [riders] = useRiders();
  const order = orders.find((o) => o.id === id);

  const load = (riderId: string) => orders.filter((o) => o.riderId === riderId && o.status !== 'delivered' && o.status !== 'cancelled').length;
  const list = riders
    .filter((r) => r.status === 'approved')
    .sort((a, b) => Number(b.online) - Number(a.online) || load(a.id) - load(b.id) || a.name.localeCompare(b.name));

  const pick = async (riderId: string, name: string) => {
    if (!order) return;
    try {
      await services.orders.assignRider(order.id, riderId);
      toast({ title: `${name} assigned to ${order.shortCode}`, body: 'They’ve been alerted and the customer was told.', emoji: '🛵', duration: 3000 });
      close();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <Sheet open={!!order} onClose={close} title={order ? `Assign a rider · ${order.shortCode}` : 'Assign a rider'} size="sm">
      {!list.length ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">No approved riders yet. Approve a registration on the Riders page first.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((r) => {
            const n = load(r.id);
            const current = order?.riderId === r.id;
            return (
              <li key={r.id}>
                <button
                  onClick={() => pick(r.id, r.name)}
                  className={cn('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors', current ? 'border-violet bg-violet/10' : 'border-line hover:border-muted/50')}
                >
                  {r.photo ? <img src={r.photo} alt="" className="h-11 w-11 rounded-xl object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-violet font-bold text-white">{initials(r.name)}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-bold">
                      {r.name}
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', r.online ? 'text-lime' : 'text-muted')}>
                        <span className={cn('h-2 w-2 rounded-full', r.online ? 'bg-lime' : 'bg-muted/50')} /> {r.online ? 'Online' : 'Offline'}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-[12px] text-muted">
                      {r.vehicle === 'walk' ? <Footprints className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
                      {r.vehicle === 'walk' ? 'On foot' : r.vehicle}{r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''} · {n} active
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-muted"><Phone className="h-3 w-3" /> +91 {r.phone}</span>
                  </span>
                  {current && <Check className="h-5 w-5 text-violet" aria-label="Currently assigned" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
