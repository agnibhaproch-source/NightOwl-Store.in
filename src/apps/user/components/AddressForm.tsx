import { useEffect, useState } from 'react';
import { Building2, DoorClosed } from 'lucide-react';
import type { Address, Hostel } from '@/shared/types';
import { Button, Input } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { uid } from '@/shared/lib/format';
import { toast } from '@/shared/store/toast';

export const addressLine = (a: Address, hostels: Hostel[]) => {
  const h = hostels.find((x) => x.id === a.hostelId);
  return `${h?.short ?? 'Hostel'} · Block ${a.block} · Room ${a.room}`;
};

/** Hostel → block → room picker. No maps, campus-only. */
export function AddressFields({
  value, onChange, hostels
}: { value: Address; onChange: (a: Address) => void; hostels: Hostel[] }) {
  const active = hostels.filter((h) => h.active);
  const hostel = active.find((h) => h.id === value.hostelId);
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="field-label flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Hostel</legend>
        <div className="grid grid-cols-2 gap-2">
          {active.map((h) => (
            <button
              key={h.id}
              type="button"
              aria-pressed={h.id === value.hostelId}
              onClick={() => onChange({ ...value, hostelId: h.id, block: h.blocks.includes(value.block) ? value.block : h.blocks[0]! })}
              className={cn(
                'rounded-2xl border p-3 text-left transition-colors',
                h.id === value.hostelId ? 'border-violet bg-violet/10' : 'border-line hover:border-muted/50'
              )}
            >
              <span className="block font-display text-lg font-extrabold">{h.short}</span>
              <span className="block truncate text-[12px] text-muted">{h.name}</span>
            </button>
          ))}
        </div>
      </fieldset>
      {hostel && (
        <fieldset>
          <legend className="field-label">Block</legend>
          <div className="flex flex-wrap gap-2">
            {hostel.blocks.map((b) => (
              <button key={b} type="button" aria-pressed={b === value.block} onClick={() => onChange({ ...value, block: b })} className="chip h-11 min-w-[52px] justify-center font-bold">
                {b}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <Input
          label="Room number"
          inputMode="numeric"
          placeholder="e.g. 214"
          value={value.room}
          maxLength={6}
          onChange={(e) => onChange({ ...value, room: e.target.value.replace(/[^0-9A-Za-z-]/g, '') })}
        />
        <Input label="Label" placeholder="My room" value={value.label} maxLength={20} onChange={(e) => onChange({ ...value, label: e.target.value })} />
      </div>
    </div>
  );
}

export const blankAddress = (hostels: Hostel[]): Address => {
  const h = hostels.find((x) => x.active);
  return { id: uid('addr'), label: 'My room', hostelId: h?.id ?? '', block: h?.blocks[0] ?? '', room: '' };
};

export function AddressEditor({
  initial, hostels, onSave, saving, submitLabel = 'Save address'
}: { initial: Address; hostels: Hostel[]; onSave: (a: Address) => void; saving?: boolean; submitLabel?: string }) {
  const [a, setA] = useState(initial);
  useEffect(() => setA(initial), [initial]);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!a.hostelId) {
          toast.error('Pick a hostel first');
          return;
        }
        if (!a.room.trim()) {
          toast.error('Add your room number', 'It goes right below the block picker.');
          return;
        }
        onSave({ ...a, label: a.label.trim() || 'My room' });
      }}
      className="space-y-5"
    >
      <AddressFields value={a} onChange={setA} hostels={hostels} />
      <Button type="submit" variant="primary" size="lg" block loading={saving} icon={<DoorClosed className="h-5 w-5" />}>
        {submitLabel}
      </Button>
    </form>
  );
}
