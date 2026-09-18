import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Clock, Moon } from 'lucide-react';
import { useStoreStatus } from '@/shared/hooks/misc';
import { fmtDuration, hmLabel } from '@/shared/lib/time';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/store/toast';
import { useSession } from '../store/session';

export function StoreBanner() {
  const { status, settings, loading } = useStoreStatus(15_000);
  const notify = useSession((s) => s.notifyWhenOpen);
  const setNotify = useSession((s) => s.setNotifyWhenOpen);
  const show = !loading && (!status.isOpen || status.closingSoon);

  const toggle = async () => {
    if (!notify && 'Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    setNotify(!notify);
    toast({ title: notify ? 'Opening alert turned off' : "We'll ping you when we open", emoji: notify ? '🔕' : '🔔' });
  };

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
          role="status"
        >
          <div className={cn('flex items-center gap-3 px-4 py-2 text-sm md:px-6', status.isOpen ? 'bg-amber/15 text-amber' : 'bg-pink/10 text-fg')}>
            {status.isOpen ? <Clock className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0 text-pink" />}
            <p className="min-w-0 flex-1">
              {status.isOpen ? (
                <>Closing in <b>{fmtDuration(status.msToChange ?? 0)}</b>. Last orders at {hmLabel(settings.closeTime)}.</>
              ) : status.manual ? (
                <><b>Store is closed right now.</b> You can still browse and fill your cart.</>
              ) : (
                <><b>Opens in {fmtDuration(status.msToChange ?? 0)}</b> at {hmLabel(settings.openTime)}. Browse and fill your cart meanwhile.</>
              )}
            </p>
            {!status.isOpen && (
              <button
                onClick={toggle}
                aria-pressed={notify}
                className={cn('hit inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold', notify ? 'bg-violet/20 text-violet' : 'bg-fg text-bg')}
              >
                <BellRing className="h-3.5 w-3.5" />
                {notify ? 'Alert on' : 'Notify me'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
