import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, ExternalLink, LogOut, Menu, Moon, Search, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { IconButton, Kbd, Logo } from '@/shared/ui';
import { useTheme } from '@/shared/store/theme';
import { useStoreStatus } from '@/shared/hooks/misc';
import { useOrders, useRiders, useTopups } from '@/shared/hooks/live';
import { services } from '@/shared/services';
import { cn } from '@/shared/lib/cn';
import { initials } from '@/shared/lib/format';
import { confirmDialog } from '@/shared/store/confirm';
import { unlockAudio } from '@/shared/lib/sound';
import { NAV } from '../nav';
import { useAdmin } from '../store/session';
import { usePalette } from './CommandPalette';

function StoreDot({ collapsed }: { collapsed: boolean }) {
  const { status } = useStoreStatus(15_000);
  return (
    <Link
      to="/admin/store"
      className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface2', status.isOpen ? 'text-lime' : 'text-pink')}
      title={status.isOpen ? 'Store open' : 'Store closed'}
    >
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        {status.isOpen && <span className="pulse-ring absolute inset-0 rounded-full bg-current" />}
        <span className="relative h-2.5 w-2.5 rounded-full bg-current" />
      </span>
      {!collapsed && <span>{status.isOpen ? 'Store open' : 'Store closed'}{status.manual ? ' · manual' : ''}</span>}
    </Link>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const owner = useAdmin((s) => s.session?.role === 'owner');
  const [orders] = useOrders();
  const pending = orders.filter((o) => o.status === 'placed').length;
  const [topups] = useTopups();
  const pendingTopups = topups.filter((t) => t.status === 'pending').length;
  const [riders] = useRiders();
  const pendingRiders = riders.filter((r) => r.status === 'pending').length;
  const groups = ['Run', 'Catalog', 'Grow', 'Insights'] as const;
  return (
    <nav aria-label="Admin" className="space-y-5">
      {groups.map((g) => {
        const items = NAV.filter((n) => n.group === g && (owner || !n.owner));
        if (!items.length) return null;
        return (
          <div key={g}>
            {!collapsed && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/80">{g}</p>}
            <ul className="space-y-0.5">
              {items.map((n) => (
                <li key={n.to}>
                  <NavLink
                    to={n.to}
                    end={n.to === '/admin'}
                    onClick={onNavigate}
                    title={collapsed ? n.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                        isActive ? 'text-fg' : 'text-muted hover:bg-surface2/70 hover:text-fg',
                        collapsed && 'justify-center px-0'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && <motion.span layoutId={onNavigate ? 'nav-m' : 'nav-d'} className="absolute inset-0 rounded-xl bg-surface2" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                        {isActive && <span className="absolute left-0 top-2 h-6 w-1 rounded-r-full bg-accent" />}
                        <n.icon className={cn('relative h-[18px] w-[18px] shrink-0', isActive && 'text-lime')} />
                        {!collapsed && <span className="relative flex-1 truncate">{n.label}</span>}
                        {n.to === '/admin/riders' && pendingRiders > 0 && (
                          <span className={cn('relative grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1.5 text-[11px] font-bold text-white', collapsed && 'absolute right-1 top-0.5')}>
                            {pendingRiders}
                          </span>
                        )}
                        {n.to === '/admin/wallet' && pendingTopups > 0 && (
                          <span className={cn('relative grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1.5 text-[11px] font-bold text-white', collapsed && 'absolute right-1 top-0.5')}>
                            {pendingTopups}
                          </span>
                        )}
                        {n.to === '/admin/orders' && pending > 0 && (
                          <span className={cn('relative grid h-5 min-w-5 place-items-center rounded-full bg-pink px-1.5 text-[11px] font-bold text-white', collapsed && 'absolute right-1 top-0.5')}>
                            {pending}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserBox({ collapsed }: { collapsed: boolean }) {
  const session = useAdmin((s) => s.session)!;
  const logout = useAdmin((s) => s.logout);
  const doLogout = async () => {
    const { ok } = await confirmDialog({ title: 'Log out of admin?', confirmLabel: 'Log out', tone: 'danger' });
    if (ok) {
      logout();
      void services.auth.adminLogout();
    }
  };
  return (
    <div className={cn('flex items-center gap-2 rounded-2xl border border-line/60 bg-surface2/40 p-2', collapsed && 'flex-col')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet text-sm font-bold text-white">{initials(session.name)}</span>
      {!collapsed && (
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">{session.name}</span>
          <span className="block text-[11px] capitalize text-muted">{session.role}</span>
        </span>
      )}
      <IconButton label="Log out" onClick={doLogout} className="h-9 w-9">
        <LogOut className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const collapsed = useAdmin((s) => s.collapsed);
  const toggle = useAdmin((s) => s.toggleCollapsed);
  const sound = useAdmin((s) => s.sound);
  const setSound = useAdmin((s) => s.setSound);
  const { theme, toggle: toggleTheme } = useTheme();
  const openPalette = usePalette((s) => s.setOpen);
  const [mobile, setMobile] = useState(false);
  const { pathname } = useLocation();
  const mac = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);
  useEffect(() => setMobile(false), [pathname]);

  return (
    <div className="flex min-h-dvh">
      <motion.aside
        animate={{ width: collapsed ? 76 : 256 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line/60 bg-surface/70 px-3 py-4 lg:flex"
      >
        <div className={cn('mb-4 flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
          <Link to="/admin" aria-label="Dashboard"><Logo size={32} withText={!collapsed} /></Link>
          {!collapsed && <span className="rounded-md bg-violet/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet">Admin</span>}
        </div>
        <StoreDot collapsed={collapsed} />
        <div className="no-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
          <NavList collapsed={collapsed} />
        </div>
        <div className="mt-3 space-y-2">
          <button
            onClick={toggle}
            className={cn('flex h-9 w-full items-center gap-2 rounded-xl px-3 text-sm text-muted hover:bg-surface2 hover:text-fg', collapsed && 'justify-center px-0')}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span animate={{ rotate: collapsed ? 180 : 0 }}><ChevronsLeft className="h-4 w-4" /></motion.span>
            {!collapsed && 'Collapse'}
          </button>
          <UserBox collapsed={collapsed} />
        </div>
      </motion.aside>

      <AnimatePresence>
        {mobile && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="safe-top absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-line bg-surface px-3 py-4"
              aria-label="Menu"
              data-lenis-prevent
            >
              <div className="mb-4 flex items-center justify-between px-1">
                <Logo size={30} />
                <IconButton label="Close menu" onClick={() => setMobile(false)}><X className="h-5 w-5" /></IconButton>
              </div>
              <StoreDot collapsed={false} />
              <div className="mt-3 min-h-0 flex-1 overflow-y-auto"><NavList collapsed={false} onNavigate={() => setMobile(false)} /></div>
              <UserBox collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col" onPointerDown={unlockAudio}>
        <header className="glass safe-top sticky top-0 z-30 border-b border-line/60">
          <div className="flex h-14 items-center gap-2 px-3 md:px-6">
            <IconButton label="Open menu" onClick={() => setMobile(true)} className="lg:hidden"><Menu className="h-5 w-5" /></IconButton>
            <button
              onClick={() => openPalette(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line/70 bg-surface2/50 px-3 text-sm text-muted transition-colors hover:border-line md:max-w-md"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">Search orders, products, pages…</span>
              <span className="hidden gap-1 sm:flex"><Kbd>{mac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
            </button>
            <div className="ml-auto flex items-center gap-0.5">
              <IconButton label={sound ? 'Mute new-order sound' : 'Unmute new-order sound'} onClick={() => { unlockAudio(); setSound(!sound); }}>
                {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5 text-pink" />}
              </IconButton>
              <IconButton label="Toggle theme" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</IconButton>
              <a href="/" target="_blank" rel="noreferrer" className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface2 hover:text-fg sm:inline-flex">
                User app <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </header>
        <main id="main" className="min-w-0 flex-1 px-3 pb-16 pt-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}

export function PageTitle({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-extrabold leading-tight md:text-[34px]">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, flush }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn('card min-w-0', !flush && 'p-4 md:p-5', className)}>
      {(title || action) && (
        <div className={cn('mb-3 flex items-center justify-between gap-2', flush && 'px-4 pt-4 md:px-5')}>
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
