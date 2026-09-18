import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Box, CornerDownLeft, Moon, Package, Power, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { create } from 'zustand';
import { useOrders, useProducts, useSettings } from '@/shared/hooks/live';
import { useHotkey } from '@/shared/hooks/misc';
import { lockScroll } from '@/shared/hooks/lenis';
import { searchProducts, normalize } from '@/shared/lib/search';
import { useTheme } from '@/shared/store/theme';
import { services } from '@/shared/services';
import { toast } from '@/shared/store/toast';
import { cn } from '@/shared/lib/cn';
import { inr } from '@/shared/lib/format';
import { STATUS_LABEL } from '@/shared/types';
import { Kbd } from '@/shared/ui';
import { NAV } from '../nav';
import { useAdmin } from '../store/session';
import { useAdminUi } from '../store/ui';

export const usePalette = create<{ open: boolean; setOpen: (v: boolean) => void }>((set) => ({
  open: false,
  setOpen: (open) => set({ open })
}));

interface Cmd { id: string; label: string; hint?: string; icon: typeof Box; group: string; run: () => void }

export function CommandPalette() {
  const { open, setOpen } = usePalette();
  const nav = useNavigate();
  const owner = useAdmin((s) => s.session?.role === 'owner');
  const [products] = useProducts();
  const [orders] = useOrders();
  const [settings] = useSettings();
  const toggleTheme = useTheme((s) => s.toggle);
  const openOrder = useAdminUi((s) => s.openOrder);
  const openProduct = useAdminUi((s) => s.editProduct);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useHotkey(
    (e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k',
    () => setOpen(!usePalette.getState().open)
  );

  useEffect(() => {
    if (!open) return;
    setQ('');
    setIdx(0);
    lockScroll(true);
    const t = setTimeout(() => input.current?.focus(), 20);
    return () => {
      clearTimeout(t);
      lockScroll(false);
    };
  }, [open]);

  const cmds = useMemo<Cmd[]>(() => {
    const close = (fn: () => void) => () => {
      setOpen(false);
      fn();
    };
    const pages: Cmd[] = NAV.filter((n) => owner || !n.owner).map((n) => ({
      id: n.to, label: n.label, hint: n.keywords, icon: n.icon, group: 'Go to', run: close(() => nav(n.to))
    }));
    const actions: Cmd[] = [
      { id: 'theme', label: 'Toggle dark / light', icon: Moon, group: 'Actions', run: close(toggleTheme) },
      { id: 'newp', label: 'Add a new product', icon: Box, group: 'Actions', run: close(() => { nav('/admin/products'); openProduct('new'); }) }
    ];
    if (owner) {
      const isOpenNow = settings.mode === 'open';
      actions.push({
        id: 'store', label: isOpenNow || settings.mode === 'auto' ? 'Force-close the store now' : 'Force-open the store now', icon: Power, group: 'Actions',
        run: close(async () => {
          const mode = isOpenNow || settings.mode === 'auto' ? 'closed' : 'open';
          await services.settings.updateSettings({ mode });
          toast({ title: mode === 'open' ? 'Store forced open' : 'Store forced closed', emoji: mode === 'open' ? '🟢' : '🔴' });
        })
      });
    }
    const t = normalize(q);
    const filter = (c: Cmd) => !t || normalize(`${c.label} ${c.hint ?? ''}`).includes(t);
    const out = [...pages.filter(filter), ...actions.filter(filter)];
    if (t) {
      const ord = orders
        .filter((o) => o.id.toLowerCase().includes(t.replace(/^#/, '')) || normalize(o.customerName).includes(t) || o.phone.includes(t))
        .slice(0, 5)
        .map<Cmd>((o) => ({
          id: `o-${o.id}`, label: `#${o.id} · ${o.customerName}`, hint: `${STATUS_LABEL[o.status]} · ${inr(o.bill.grandTotal)}`,
          icon: Package, group: 'Orders', run: close(() => openOrder(o.id))
        }));
      const prods = searchProducts(products, [], q).slice(0, 6).map<Cmd>((p) => ({
        id: `p-${p.id}`, label: p.name, hint: `${p.stock} in stock · ${inr(p.price)}`, icon: Box, group: 'Products',
        run: close(() => { nav('/admin/products'); openProduct(p.id); })
      }));
      return [...ord, ...prods, ...out];
    }
    return out;
  }, [q, owner, orders, products, settings.mode, nav, setOpen, toggleTheme, openOrder, openProduct]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [idx]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(cmds.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter') { e.preventDefault(); cmds[idx]?.run(); }
    if (e.key === 'Escape') setOpen(false);
  };

  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center p-3 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl"
            onKeyDown={onKey}
            data-lenis-prevent
          >
            <div className="flex items-center gap-3 border-b border-line/70 px-4">
              <Search className="h-5 w-5 text-violet" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a command, order ID or product…"
                className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmdk-list"
                aria-activedescendant={cmds[idx] ? `cmd-${idx}` : undefined}
              />
              <Kbd>Esc</Kbd>
            </div>
            <ul ref={listRef} id="cmdk-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
              {!cmds.length && <li className="px-3 py-8 text-center text-muted">Nothing found for “{q}”</li>}
              {cmds.map((c, i) => {
                const head = c.group !== lastGroup;
                lastGroup = c.group;
                return (
                  <li key={c.id} role="presentation">
                    {head && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{c.group}</p>}
                    <button
                      id={`cmd-${i}`}
                      data-idx={i}
                      role="option"
                      aria-selected={i === idx}
                      onMouseMove={() => setIdx(i)}
                      onClick={c.run}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', i === idx && 'bg-surface2')}
                    >
                      <c.icon className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium">{c.label}</span>
                      {c.hint && c.group !== 'Go to' && <span className="truncate text-[12px] text-muted">{c.hint}</span>}
                      {i === idx && (c.group === 'Go to' ? <ArrowRight className="h-4 w-4 text-muted" /> : <CornerDownLeft className="h-4 w-4 text-muted" />)}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
