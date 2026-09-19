import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Headphones, Heart, MapPin, Package, Pencil, Settings as SettingsIcon, Share2, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Sheet, IconButton, Skeleton } from '@/shared/ui';
import { toast } from '@/shared/store/toast';
import { services, errorMessage } from '@/shared/services';
import { useUserOrders } from '@/shared/hooks/live';
import { initials, inr } from '@/shared/lib/format';
import { APP } from '@/shared/config/app';
import { useCurrentUser } from '../hooks';
import { useSession } from '../store/session';
import { Page, PageHeader } from '../components/Page';
import { LoginPrompt } from '../components/LoginPrompt';
import { ReceiverSheet } from '../components/ReceiverSheet';
import { shareApp } from '../lib/share';

function Row({ icon: Icon, label, sub, to, onClick, right }: { icon: typeof Package; label: string; sub?: string; to?: string; onClick?: () => void; right?: React.ReactNode }) {
  const inner = (
    <>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2"><Icon className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block truncate text-[13px] text-muted">{sub}</span>}
      </span>
      {right ?? <ChevronRight className="h-5 w-5 text-muted" />}
    </>
  );
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2/60';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
}

export default function Profile() {
  const nav = useNavigate();
  const { userId, customer, loading } = useCurrentUser();
  const [orders] = useUserOrders(userId);
  const favCount = useSession((s) => s.favorites.length);
  const [editing, setEditing] = useState(false);
  const [receiverOpen, setReceiverOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const delivered = orders.filter((o) => o.status === 'delivered');
  const saved = delivered.reduce((a, o) => a + o.bill.productDiscount + o.bill.couponDiscount, 0);

  const saveName = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      await services.customers.saveProfile({ ...customer, name: name.trim() });
      setEditing(false);
      toast.success('Name updated');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const gear = (
    <IconButton label="Settings" onClick={() => nav('/settings')}>
      <SettingsIcon className="h-5 w-5" />
    </IconButton>
  );

  return (
    <Page>
      <PageHeader title="Profile" back={false} right={gear} />
      {!userId ? (
        <>
          <LoginPrompt emoji="🦉" title="Hey, night owl" body="Log in to save your room, track orders and get alerts." />
          <div className="card divide-y divide-line/50 overflow-hidden">
            <Row icon={Headphones} label="Customer care" sub="Call or email us" to="/support" />
            <Row icon={Share2} label="Share the app" sub="Tell your hostel" onClick={shareApp} />
            <Row icon={SettingsIcon} label="Settings" to="/settings" />
          </div>
        </>
      ) : loading || !customer ? (
        <Skeleton className="h-40 rounded-card" />
      ) : (
        <div className="space-y-4">
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-5">
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full" style={{ background: 'radial-gradient(closest-side, rgb(var(--violet) / .4), transparent)' }} />
            <div className="relative flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[22px] bg-violet font-display text-2xl font-extrabold text-white shadow-violet">
                {initials(customer.name)}
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-2xl font-extrabold">{customer.name}</h2>
                {customer.phone && <p className="text-sm text-muted">+91 {customer.phone.replace(/(\d{5})(\d)/, '$1 $2')}</p>}
              </div>
              <Button size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setName(customer.name); setEditing(true); }}>Edit</Button>
            </div>
            <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { v: delivered.length, l: 'Orders' },
                { v: inr(saved), l: 'Saved' },
                { v: favCount, l: 'Favourites' }
              ].map((st) => (
                <div key={st.l} className="rounded-2xl bg-surface2/70 py-3">
                  <p className="price font-display text-xl font-extrabold">{st.v}</p>
                  <p className="text-[12px] text-muted">{st.l}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <section className="card p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><User className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Receiver details</p>
                {customer.receiver ? (
                  <p className="truncate font-bold">{customer.receiver.name} · +91 {customer.receiver.phone}</p>
                ) : (
                  <p className="text-sm text-muted">Who takes the order at the door? Add a name and number.</p>
                )}
              </div>
              <Button size="sm" variant={customer.receiver ? 'secondary' : 'violet'} onClick={() => setReceiverOpen(true)}>{customer.receiver ? 'Edit' : 'Add'}</Button>
            </div>
          </section>

          <div className="card divide-y divide-line/50 overflow-hidden">
            <Row icon={Package} label="Your orders" to="/orders" />
            <Row icon={MapPin} label="Saved rooms" sub={`${customer.addresses.length} saved`} to="/profile/addresses" />
            <Row icon={Heart} label="Favourites" to="/favorites" />
          </div>

          <div className="card divide-y divide-line/50 overflow-hidden">
            <Row icon={Headphones} label="Customer care" sub="Call or email us" to="/support" />
            <Row icon={Share2} label="Share the app" sub="Tell your hostel" onClick={shareApp} />
            <Row icon={SettingsIcon} label="Settings" sub="Theme, notifications, help, log out" to="/settings" />
          </div>
        </div>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit name" size="sm"
        footer={<Button variant="primary" block loading={saving} disabled={!name.trim()} onClick={saveName}>Save</Button>}
      >
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <p className="mt-2 text-[13px] text-muted">This is your account name. Use Receiver details for who takes the order.</p>
      </Sheet>
      {customer && <ReceiverSheet open={receiverOpen} customer={customer} onClose={() => setReceiverOpen(false)} />}
    </Page>
  );
}
