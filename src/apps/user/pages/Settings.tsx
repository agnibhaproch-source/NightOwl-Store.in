import { Bell, ChevronRight, Download, FileText, HelpCircle, LogOut, Moon, Shield, Sun } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Switch } from '@/shared/ui';
import { useTheme } from '@/shared/store/theme';
import { confirmDialog } from '@/shared/store/confirm';
import { toast } from '@/shared/store/toast';
import { APP } from '@/shared/config/app';
import { isNative } from '@/shared/lib/native';
import { useSession } from '../store/session';
import { useCart } from '../store/cart';
import { useInstall } from '../lib/install';
import { Page, PageHeader } from '../components/Page';

function Row({ icon: Icon, label, sub, to }: { icon: typeof Bell; label: string; sub?: string; to: string }) {
  return (
    <Link to={to} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface2/60">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2"><Icon className="h-[18px] w-[18px]" /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        {sub && <span className="block truncate text-[13px] text-muted">{sub}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-muted" />
    </Link>
  );
}

export default function Settings() {
  const nav = useNavigate();
  const userId = useSession((s) => s.userId);
  const logout = useSession((s) => s.logout);
  const clearCart = useCart((s) => s.clear);
  const { theme, set: setTheme } = useTheme();
  const install = useInstall();

  const doLogout = async () => {
    const { ok } = await confirmDialog({ title: 'Log out?', body: 'Your cart will be cleared on this device.', confirmLabel: 'Log out', tone: 'danger' });
    if (!ok) return;
    logout();
    clearCart();
    toast({ title: 'Logged out. See you tonight.', emoji: '👋' });
    nav('/');
  };

  return (
    <Page>
      <PageHeader title="Settings" back="/profile" />
      <div className="space-y-4">
        <div className="card divide-y divide-line/50 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface2">{theme === 'dark' ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}</span>
            <div className="flex-1"><Switch label="Dark mode" checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} /></div>
          </div>
          <Row icon={Bell} label="Notifications" sub="Choose what we ping you about" to="/settings/notifications" />
          {!install.installed && !isNative && <Row icon={Download} label="Get the app" sub="For Android and iPhone" to="/get-app" />}
        </div>

        <div className="card divide-y divide-line/50 overflow-hidden">
          <Row icon={HelpCircle} label="Help & FAQ" to="/help" />
          <Row icon={FileText} label="Terms of service" to="/legal/terms" />
          <Row icon={Shield} label="Privacy policy" to="/legal/privacy" />
        </div>

        {userId && (
          <Button block size="lg" variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={doLogout} className="text-pink">
            Log out
          </Button>
        )}
        <p className="text-center text-[12px] text-muted">{APP.name} v1.0</p>
      </div>
    </Page>
  );
}
