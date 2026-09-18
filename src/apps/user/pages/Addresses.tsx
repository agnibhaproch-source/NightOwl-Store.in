import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Badge, Button, EmptyState, IconButton, Sheet } from '@/shared/ui';
import { useSettings } from '@/shared/hooks/live';
import { services, errorMessage } from '@/shared/services';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import type { Address } from '@/shared/types';
import { useCurrentUser } from '../hooks';
import { Page, PageHeader } from '../components/Page';
import { AddressEditor, addressLine, blankAddress } from '../components/AddressForm';
import { LoginPrompt } from '../components/LoginPrompt';
import { useCart } from '../store/cart';

export default function Addresses() {
  const { userId, customer } = useCurrentUser();
  const [settings] = useSettings();
  const [editing, setEditing] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const setCartAddress = useCart((s) => s.setAddress);

  if (!userId || !customer)
    return (
      <Page>
        <PageHeader title="Saved rooms" />
        {!userId && <LoginPrompt emoji="🏠" title="Save your room" body="Log in to keep your hostel, block and room handy." />}
      </Page>
    );

  const isNew = editing && !customer.addresses.some((a) => a.id === editing.id);

  const save = async (a: Address) => {
    setSaving(true);
    try {
      await services.customers.saveAddress(customer.id, a);
      toast.success(isNew ? 'Room added' : 'Room updated');
      setEditing(null);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Address) => {
    if (customer.addresses.length === 1) {
      toast.error('Keep at least one room', 'Add another before removing this one.');
      return;
    }
    const { ok } = await confirmDialog({ title: `Remove “${a.label}”?`, confirmLabel: 'Remove', tone: 'danger' });
    if (ok) {
      await services.customers.deleteAddress(customer.id, a.id);
      toast({ title: 'Room removed', emoji: '🗑️' });
    }
  };

  const makeDefault = async (a: Address) => {
    await services.customers.saveAddress(customer.id, a, true);
    setCartAddress(a.id);
    toast({ title: `${a.label} is now your default`, emoji: '⭐' });
  };

  return (
    <Page>
      <PageHeader title="Saved rooms" right={<Button size="sm" variant="violet" icon={<Plus className="h-4 w-4" />} onClick={() => setEditing(blankAddress(settings.hostels))}>Add</Button>} />
      {!customer.addresses.length ? (
        <EmptyState emoji="🏠" title="No rooms saved" action={<Button variant="primary" onClick={() => setEditing(blankAddress(settings.hostels))}>Add your room</Button>} />
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {customer.addresses.map((a) => {
              const def = a.id === customer.defaultAddressId;
              const hostel = settings.hostels.find((h) => h.id === a.hostelId);
              const ok = !!hostel?.active && hostel.blocks.includes(a.block);
              return (
                <motion.li key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="card flex items-center gap-3 p-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan/15 text-cyan"><MapPin className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-bold">{a.label} {def && <Badge tone="lime">Default</Badge>}</p>
                    <p className="truncate text-sm text-muted">{addressLine(a, settings.hostels)}</p>
                    {!ok && <p className="text-[12px] font-semibold text-pink">We don’t deliver here right now</p>}
                  </div>
                  {!def && (
                    <IconButton label={`Make ${a.label} default`} onClick={() => makeDefault(a)}>
                      <Star className="h-4 w-4" />
                    </IconButton>
                  )}
                  <IconButton label={`Edit ${a.label}`} onClick={() => setEditing(a)}>
                    <Pencil className="h-4 w-4" />
                  </IconButton>
                  <IconButton label={`Remove ${a.label}`} onClick={() => remove(a)}>
                    <Trash2 className="h-4 w-4 text-pink" />
                  </IconButton>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
      <Sheet open={!!editing} onClose={() => setEditing(null)} title={isNew ? 'Add a room' : 'Edit room'}>
        {editing && <AddressEditor initial={editing} hostels={settings.hostels} onSave={save} saving={saving} submitLabel={isNew ? 'Add room' : 'Save changes'} />}
      </Sheet>
    </Page>
  );
}
