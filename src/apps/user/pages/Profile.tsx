import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, ChevronRight, Download, FileText, Heart, HelpCircle, LogOut, MapPin, Moon, Package, Pencil, Shield, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Sheet, Skeleton, Switch } from '@/shared/ui';
import { useTheme } from '@/shared/store/theme';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import { services, errorMessage } from '@/shared/services';
import { useUserOrders } from '@/shared/hooks/live';
import { initials, inr } from '@/shared/lib/format';
import { APP } from '@/shared/config/app';
import { useCurrentUser } from '../hooks';
import { useSession } from '../store/session';
import { useCart } from '../store/cart';
import { useInstall } from '../lib/install';
import { Page, PageHeader } from '../components/Page';
import { LoginPrompt } from '../components/LoginPrompt';
import { ThemeButton } from '../components/Nav';

function Row({ icon: Icon, label, sub, to, onClick, right }: { icon: typeof Bell; label: string; sub?: string; to?: string; onClick?: () => void; right?: React.ReactNode }) {
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
  const logout = useSession((s) => s.logout);
  const favCount = useSession((s) => s.favorites.length);
  const clearCart = useCart((s) => s.clear);
  const { theme, set: setTheme } = useTheme();
  const install = useInstall();
  const [editing, setEditing] = useState(false);
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

  const doLogout = async () => {
    const { ok } = await confirmDialog({ title: 'Log out?', body: 'Your cart will be cleared on this device.', confirmLabel: 'Log out', tone: 'danger' });
    if (!ok) return;
    logout();
    clearCart();
    toast({ title: 'Logged out. See you tonight.', emoji: '👋' });
    nav('/');
  };

  const doInstall = async () => {
    if (install.canPrompt) {
      const ok = await install.prompt();
      if (ok) toast.success(`${APP.name} installed`);
    } else if (install.ios) {
      toast({ title: 'Install on iPhone', body: 'Tap Share, then “Add to Home Screen”.', emoji: '📲', duration: 7000 });
    } else {
      toast({ title: 'Install from your browser menu', body: 'Look for “Install app” or “Add to Home screen”.', emoji: '📲', duration: 6000 });
    }
  };

  return (
    <Page>
      <PageHeader title="Profile" back={false} right={<ThemeButton />} />
      {!userId ? (
        <>
          <LoginPrompt emoji="🦉" title="Hey, night owl" body="Log in to save your room, track orders and get alerts." />
          <div className="card divide-y divide-line/50 overflow-hidden">
            <Row icon={HelpCircle} label="Help & FAQ" to="/help" />
            <Row icon={FileText} label="Terms of service" to="/legal/terms" />
            <Row icon={Shield} label="Privacy policy" to="/legal/privacy" />
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
              ].map((s) => (
                <div key={s.l} className="rounded-2xl bg-surface2/70 py-3">
                  <p className="price font-display text-xl font-extrabold">{s.v}</p>
                  <p className="text-[12px] text-muted">{s.l}</p>
                </div>
              ))}
            </div>
          </motion.section>

          <div className="card divide-y divide-line/50 overflow-hidden">
            <Row icon={Package} label="Your orders" to="/orders" />
            <Row icon={MapPin} label="Saved rooms" sub={`${customer.addresses.length} saved`} to="/profile/addresses" />
            <Row icon={Heart} label="Favourites" to="/favorites" />
            <Row icon={Bell} label="Notifications" sub="Choose what we ping you about" to="/settings/notifications" />
          </div>

          <div className="card divide-y divide-line/50 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2">{theme === 'dark' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}</span>
              <div className="flex-1"><Switch label="Dark mode" checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} /></div>
            </div>
            {!install.installed && <Row icon={Download} label={`Install ${APP.name}`} sub="Faster, full-screen, works offline" onClick={doInstall} />}
            <Row icon={HelpCircle} label="Help & support" to="/help" />
            <Row icon={FileText} label="Terms of service" to="/legal/terms" />
            <Row icon={Shield} label="Privacy policy" to="/legal/privacy" />
          </div>

          <Button block size="lg" variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={doLogout} className="text-pink">
            Log out
          </Button>
          <p className="text-center text-[12px] text-muted">
            {APP.name} v1.0 · <Link to="/admin" className="underline">Store admin</Link>
          </p>
        </div>
      )}

      <Sheet open={editing} onClose={() => setEditing(false)} title="Edit name" size="sm"
        footer={<Button variant="primary" block loading={saving} disabled={!name.trim()} onClick={saveName}>Save</Button>}
      >
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <p className="mt-2 text-[13px] text-muted">Phone number can’t be changed. It’s how we find your orders.</p>
      </Sheet>
    </Page>
  );
}
