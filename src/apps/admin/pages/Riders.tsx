import { useState } from 'react';
import { Ban, Check, Mail, Phone, ShieldCheck, UserRoundCheck, X } from 'lucide-react';
import { useOrders, useRiders } from '@/shared/hooks/live';
import { Badge, Button, EmptyState, Segmented, Skeleton } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { confirmDialog } from '@/shared/store/confirm';
import { cn } from '@/shared/lib/cn';
import { fmtDateTime, initials } from '@/shared/lib/format';
import type { Rider, RiderStatus } from '@/shared/types';
import { PageTitle, Panel } from '../components/Layout';

type Tab = 'pending' | 'approved' | 'other';
const ID_LABEL = { college: 'College ID', aadhaar: 'Aadhaar', licence: 'Driving licence' } as const;
const TONE: Record<RiderStatus, 'amber' | 'lime' | 'pink' | 'violet'> = { pending: 'amber', approved: 'lime', rejected: 'pink', suspended: 'pink' };

async function change(r: Rider, status: RiderStatus) {
  let reason: string | undefined;
  if (status === 'rejected' || status === 'suspended') {
    const res = await confirmDialog({
      title: status === 'rejected' ? `Reject ${r.name}?` : `Suspend ${r.name}?`,
      body: 'They’ll see this reason on their screen.',
      confirmLabel: status === 'rejected' ? 'Reject' : 'Suspend',
      tone: 'danger',
      input: { label: 'Reason', options: ['Details could not be verified', 'Not enough information', 'Too many complaints', 'Not needed right now'], required: true, placeholder: 'Tell the rider why' }
    });
    if (!res.ok) return;
    reason = res.value.trim();
  } else if (status === 'approved') {
    const res = await confirmDialog({ title: `Approve ${r.name}?`, body: 'Only approve once you’ve checked their ID. They can take deliveries straight away.', confirmLabel: 'Approve rider' });
    if (!res.ok) return;
  }
  try {
    await services.riders.setStatus(r.id, status, reason);
    toast({ title: `${r.name} ${status === 'approved' ? 'approved' : status}`, emoji: status === 'approved' ? '✅' : '🛑', duration: 2500 });
  } catch (e) {
    toast.error(errorMessage(e));
  }
}

function RiderCard({ r, done, active }: { r: Rider; done: number; active: number }) {
  return (
    <article className="rounded-2xl border border-line/70 bg-surface p-4">
      <div className="flex items-start gap-3">
        {r.photo ? <img src={r.photo} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" /> : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-violet font-display text-xl font-extrabold text-white">{initials(r.name)}</span>}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-extrabold">
            {r.name} <Badge tone={TONE[r.status]}>{r.status}</Badge>
            {r.status === 'approved' && <span className={cn('inline-flex items-center gap-1 text-[12px] font-semibold', r.online ? 'text-lime' : 'text-muted')}><span className={cn('h-2 w-2 rounded-full', r.online ? 'bg-lime' : 'bg-muted/50')} /> {r.online ? 'Online' : 'Offline'}</span>}
          </p>
          <p className="text-[12px] text-muted">Registered {fmtDateTime(r.createdAt)}{r.area ? ` · ${r.area}` : ''}</p>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
        <div><dt className="text-[12px] text-muted">Mobile</dt><dd><a className="inline-flex items-center gap-1 font-semibold hover:underline" href={`tel:+91${r.phone}`}><Phone className="h-3.5 w-3.5" /> +91 {r.phone}</a></dd></div>
        <div><dt className="text-[12px] text-muted">Email</dt><dd className="truncate"><a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${r.email}`}><Mail className="h-3.5 w-3.5" /> {r.email}</a></dd></div>
        <div><dt className="text-[12px] text-muted">Vehicle</dt><dd className="font-semibold capitalize">{r.vehicle === 'walk' ? 'On foot' : r.vehicle}{r.vehicleNumber ? ` · ${r.vehicleNumber}` : ''}</dd></div>
        <div><dt className="text-[12px] text-muted">{ID_LABEL[r.idType]}</dt><dd className="font-semibold">{r.idNumber}</dd></div>
        <div className="sm:col-span-2"><dt className="text-[12px] text-muted">Emergency contact</dt><dd className="font-semibold">{r.emergencyName} · <a href={`tel:+91${r.emergencyPhone}`} className="hover:underline">+91 {r.emergencyPhone}</a></dd></div>
      </dl>
      {r.statusReason && r.status !== 'approved' && <p className="mt-2 text-sm text-pink">Reason: {r.statusReason}</p>}
      {r.status === 'approved' && <p className="mt-2 text-[12px] text-muted">{done} delivered · {active} in progress</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {r.status !== 'approved' && <Button variant="primary" size="sm" icon={<Check className="h-4 w-4" />} onClick={() => change(r, 'approved')}>{r.status === 'pending' ? 'Approve' : 'Reinstate'}</Button>}
        {r.status === 'pending' && <Button size="sm" className="text-pink" icon={<X className="h-4 w-4" />} onClick={() => change(r, 'rejected')}>Reject</Button>}
        {r.status === 'approved' && <Button size="sm" className="text-pink" icon={<Ban className="h-4 w-4" />} onClick={() => change(r, 'suspended')}>Suspend</Button>}
      </div>
    </article>
  );
}

export default function Riders() {
  const [riders, loading] = useRiders();
  const [orders] = useOrders();
  const [tab, setTab] = useState<Tab>('pending');
  const groups: Record<Tab, Rider[]> = {
    pending: riders.filter((r) => r.status === 'pending'),
    approved: riders.filter((r) => r.status === 'approved'),
    other: riders.filter((r) => r.status === 'rejected' || r.status === 'suspended')
  };
  const stats = (id: string) => ({
    done: orders.filter((o) => o.riderId === id && o.status === 'delivered').length,
    active: orders.filter((o) => o.riderId === id && o.status !== 'delivered' && o.status !== 'cancelled').length
  });
  const list = groups[tab];

  return (
    <>
      <PageTitle title="Riders" sub="People who registered to deliver. Approve them, then assign orders from Live orders." />
      <div className="mb-4">
        <Segmented
          label="Rider group"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'pending', label: `Waiting (${groups.pending.length})` },
            { value: 'approved', label: `Active (${groups.approved.length})` },
            { value: 'other', label: `Rejected & paused (${groups.other.length})` }
          ]}
        />
      </div>
      {loading ? (
        <Skeleton className="h-48 rounded-3xl" />
      ) : !list.length ? (
        <Panel>
          <EmptyState emoji={tab === 'pending' ? '🛵' : '🙌'} title={tab === 'pending' ? 'No registrations waiting' : 'Nobody here'} body={tab === 'pending' ? 'Riders register at /rider on this website. Share that link with them.' : undefined} />
        </Panel>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">{list.map((r) => <RiderCard key={r.id} r={r} {...stats(r.id)} />)}</div>
      )}
      <p className="mt-4 flex items-center gap-2 text-[12px] text-muted"><ShieldCheck className="h-4 w-4" /><UserRoundCheck className="h-4 w-4" /> ID numbers are visible only to you and the rider.</p>
    </>
  );
}
