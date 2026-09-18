import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../lib/cn';
import { useMediaQuery } from '../hooks/misc';
import { lockScroll } from '../hooks/lenis';
import { useConfirmStore } from '../store/confirm';
import { Button, IconButton } from './Button';
import { Input, Select } from './primitives';

let openCount = 0;
function useOverlayEffects(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    openCount++;
    lockScroll(true);
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => panel.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
        );
        if (!f.length) return;
        const first = f[0]!;
        const last = f[f.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      openCount--;
      if (!openCount) lockScroll(false);
      prev?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  hideHeader?: boolean;
  label?: string;
}

/** Bottom sheet on phones (drag down to close), centered dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, size = 'md', hideHeader, label }: SheetProps) {
  const desktop = useMediaQuery('(min-width: 640px)');
  const panel = useRef<HTMLDivElement>(null);
  const controls = useDragControls();
  useOverlayEffects(open, onClose, panel);
  const startDrag = (e: React.PointerEvent) => {
    if (!desktop) controls.start(e);
  };
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };
  const width = size === 'sm' ? 'sm:max-w-sm' : size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={label ?? (typeof title === 'string' ? title : undefined)}
            tabIndex={-1}
            data-lenis-prevent
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-sheet border border-line/70 bg-surface outline-none sm:rounded-sheet',
              width
            )}
            style={{ boxShadow: '0 -20px 60px -20px rgb(0 0 0 / .6)' }}
            initial={desktop ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            drag={desktop ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            {!desktop && (
              <div className="shrink-0 touch-none pb-1 pt-2.5" onPointerDown={startDrag} aria-hidden>
                <div className="mx-auto h-1.5 w-10 rounded-full bg-line" />
              </div>
            )}
            {!hideHeader && (
              <div className="flex touch-none items-center gap-2 px-5 pb-2 pt-2 sm:pt-5" onPointerDown={startDrag}>
                <h2 className="min-w-0 flex-1 text-xl font-bold">{title}</h2>
                <IconButton label="Close" onClick={onClose} className="-mr-2">
                  <X className="h-5 w-5" />
                </IconButton>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
              {children}
            </div>
            {footer && <div className="safe-bottom border-t border-line/70 bg-surface px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Right-side drawer (full-screen on phones). */
export function Drawer({
  open, onClose, title, children, footer, width = 'md'
}: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: 'md' | 'lg' }) {
  const panel = useRef<HTMLDivElement>(null);
  useOverlayEffects(open, onClose, panel);
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <motion.div className="absolute inset-0 bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={typeof title === 'string' ? title : 'Details'}
            tabIndex={-1}
            data-lenis-prevent
            className={cn('relative flex h-full w-full flex-col border-l border-line/70 bg-surface outline-none', width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md')}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
          >
            <div className="safe-top flex items-center gap-2 border-b border-line/70 px-5 py-3">
              <div className="min-w-0 flex-1 text-lg font-bold">{title}</div>
              <IconButton label="Close" onClick={onClose} className="-mr-2">
                <X className="h-5 w-5" />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="safe-bottom border-t border-line/70 px-5 py-3">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export function ConfirmHost() {
  const open = useConfirmStore((s) => s.open);
  const [value, setValue] = useState('');
  useEffect(() => {
    if (open) setValue(open.input?.options?.[0] ?? '');
  }, [open]);
  const close = (ok: boolean) => {
    open?.resolve({ ok, value });
    useConfirmStore.setState({ open: null });
  };
  const needs = open?.input?.required && !value.trim();
  return (
    <Sheet open={!!open} onClose={() => close(false)} title={open?.title} size="sm"
      footer={
        <div className="flex gap-2">
          <Button block onClick={() => close(false)}>Cancel</Button>
          <Button block variant={open?.tone === 'danger' ? 'danger' : 'primary'} disabled={needs} onClick={() => close(true)}>
            {open?.confirmLabel ?? 'Confirm'}
          </Button>
        </div>
      }
    >
      {open?.body && <p className="text-muted">{open.body}</p>}
      {open?.input && (
        <div className="mt-4 space-y-3">
          {open.input.options && (
            <Select label={open.input.label} value={open.input.options.includes(value) ? value : '__other'} onChange={(e) => setValue(e.target.value === '__other' ? '' : e.target.value)}>
              {open.input.options.map((o) => <option key={o} value={o}>{o}</option>)}
              <option value="__other">Something else…</option>
            </Select>
          )}
          {(!open.input.options || !open.input.options.includes(value)) && (
            <Input
              label={open.input.options ? 'Reason' : open.input.label}
              placeholder={open.input.placeholder}
              value={value}
              autoFocus
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
      )}
    </Sheet>
  );
}
