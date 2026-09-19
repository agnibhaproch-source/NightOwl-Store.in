import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button, Input, Logo, Segmented } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { readImageAsDataUrl } from '@/shared/lib/files';
import { cn } from '@/shared/lib/cn';
import type { RiderIdType, RiderVehicle } from '@/shared/types';

const VEHICLES: { v: RiderVehicle; label: string; emoji: string }[] = [
  { v: 'bike', label: 'Bike', emoji: '🏍️' },
  { v: 'scooter', label: 'Scooter', emoji: '🛵' },
  { v: 'cycle', label: 'Cycle', emoji: '🚲' },
  { v: 'walk', label: 'On foot', emoji: '🚶' }
];
const IDS: { v: RiderIdType; label: string }[] = [
  { v: 'college', label: 'College ID' },
  { v: 'aadhaar', label: 'Aadhaar' },
  { v: 'licence', label: 'Driving licence' }
];
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 10);

function Chips<T extends string>({ items, value, onChange }: { items: { v: T; label: string; emoji?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((i) => (
        <button key={i.v} type="button" className="chip" aria-pressed={value === i.v} onClick={() => onChange(i.v)}>
          {i.emoji && <span aria-hidden>{i.emoji}</span>} {i.label}
        </button>
      ))}
    </div>
  );
}

export function Auth({ notice }: { notice?: string }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({
    name: '', phone: '', email: '', password: '', vehicle: 'bike' as RiderVehicle, vehicleNumber: '',
    idType: 'college' as RiderIdType, idNumber: '', emergencyName: '', emergencyPhone: '', area: '', photo: ''
  });
  const file = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const needsPlate = f.vehicle === 'bike' || f.vehicle === 'scooter';

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Pick an image file');
    try {
      set('photo', await readImageAsDataUrl(file, 240));
    } catch {
      toast.error('Could not read that photo');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'signin') await services.riders.login(f.email, f.password);
      else {
        await services.riders.register({ ...f, vehicleNumber: needsPlate ? f.vehicleNumber : undefined, photo: f.photo || undefined });
        toast.success('Registered', 'The store will review your details.');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="safe-top safe-bottom mx-auto min-h-dvh max-w-md px-5 pb-10 pt-8">
      <div className="flex items-center gap-3">
        <Logo size={40} withText={false} />
        <div>
          <p className="font-display text-xl font-extrabold leading-none">NightOwl Rider</p>
          <p className="text-[13px] text-muted">Deliver snacks, earn tonight</p>
        </div>
      </div>

      {notice && <p className="mt-5 rounded-2xl border border-amber/40 bg-amber/10 p-3 text-sm">{notice}</p>}

      <div className="mt-6">
        <Segmented label="Sign in or register" value={mode} onChange={(v) => { setMode(v); setError(''); }} options={[{ value: 'signin', label: 'Sign in' }, { value: 'register', label: 'Register as a rider' }]} />
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {mode === 'register' && (
          <>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => file.current?.click()} className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-line bg-surface2 text-muted" aria-label="Add a photo">
                {f.photo ? <img src={f.photo} alt="" className="h-full w-full object-cover" /> : <Camera className="h-6 w-6" />}
              </button>
              <input ref={file} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
              <p className="text-[13px] text-muted">Add a clear photo of your face. Customers see your name, not this photo, but the store uses it to verify you.</p>
            </div>
            <Input label="Full name" autoComplete="name" value={f.name} maxLength={40} onChange={(e) => set('name', e.target.value)} />
            <Input label="Mobile number" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" value={f.phone} onChange={(e) => set('phone', digits(e.target.value))} />
          </>
        )}

        <Input label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        <Input label="Password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} hint={mode === 'register' ? 'At least 8 characters' : undefined} value={f.password} onChange={(e) => set('password', e.target.value)} />

        {mode === 'register' && (
          <>
            <fieldset>
              <legend className="field-label">How will you deliver?</legend>
              <Chips items={VEHICLES.map((v) => ({ v: v.v, label: v.label, emoji: v.emoji }))} value={f.vehicle} onChange={(v) => set('vehicle', v)} />
              {needsPlate && <div className="mt-3"><Input label="Number plate" placeholder="e.g. WB 12 AB 3456" value={f.vehicleNumber} maxLength={14} onChange={(e) => set('vehicleNumber', e.target.value.toUpperCase())} /></div>}
            </fieldset>

            <fieldset>
              <legend className="field-label">ID for verification</legend>
              <Chips items={IDS} value={f.idType} onChange={(v) => set('idType', v)} />
              <div className="mt-3"><Input label="ID number" value={f.idNumber} maxLength={24} onChange={(e) => set('idNumber', e.target.value)} hint="Only the store owner can see this" /></div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="field-label">Emergency contact</legend>
              <Input label="Name" value={f.emergencyName} maxLength={40} onChange={(e) => set('emergencyName', e.target.value)} />
              <Input label="Mobile number" inputMode="numeric" value={f.emergencyPhone} onChange={(e) => set('emergencyPhone', digits(e.target.value))} />
            </fieldset>

            <Input label="Hostel or area you stay in (optional)" value={f.area} maxLength={40} onChange={(e) => set('area', e.target.value)} />
            <p className="text-[12px] text-muted">The store checks your details before you can take deliveries. You’ll see your status as soon as you register.</p>
          </>
        )}

        <p className={cn('min-h-[20px] text-sm text-pink')} role="alert">{error}</p>
        <Button type="submit" variant="primary" size="lg" block loading={busy} icon={busy ? <Loader2 className="h-5 w-5 animate-spin" /> : undefined}>
          {mode === 'signin' ? 'Sign in' : 'Register'}
        </Button>
      </form>
    </main>
  );
}
