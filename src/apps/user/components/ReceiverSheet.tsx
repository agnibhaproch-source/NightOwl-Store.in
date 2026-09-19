import { useEffect, useState } from 'react';
import { Button, Input, Sheet } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import type { Customer } from '@/shared/types';

const digits = (v: string) => v.replace(/\D/g, '').slice(-10);

/** The person who'll take the order at the door. Saved on the account and copied onto every order. */
export function ReceiverSheet({ open, onClose, customer, skippable }: { open: boolean; onClose: () => void; customer: Customer; skippable?: boolean }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer.receiver?.name ?? (customer.name === 'Night Owl' ? '' : customer.name));
    setPhone(customer.receiver?.phone ?? customer.phone ?? '');
  }, [open, customer]);

  const save = async () => {
    setSaving(true);
    try {
      await services.customers.saveReceiver(customer.id, { name, phone });
      toast.success('Receiver saved', 'We’ll use this at checkout.');
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Who’s receiving the order?"
      size="sm"
      footer={
        <div className="flex gap-2">
          {skippable && <Button onClick={onClose}>Later</Button>}
          <Button variant="primary" block loading={saving} disabled={!name.trim() || phone.length !== 10} onClick={save}>Save details</Button>
        </div>
      }
    >
      <p className="mb-4 text-[13px] text-muted">The rider will call this person at the door. It can be you or a roommate, and you can change it any time.</p>
      <div className="space-y-4">
        <Input label="Receiver’s name" placeholder="Full name" autoComplete="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <Input label="Receiver’s mobile number" placeholder="10-digit number" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(e) => setPhone(digits(e.target.value))} />
      </div>
    </Sheet>
  );
}
