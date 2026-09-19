import { useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';
import { APP } from '@/shared/config/app';
import { isNative } from '@/shared/lib/native';
import { isIOS, isStandalone } from '../lib/install';

const KEY = 'no:ios-install-dismissed';

/** iPhones can't download an app file, so nudge Safari visitors to add NightOwl to the Home Screen. */
export function IosInstallBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  if (hidden || isNative || !isIOS() || isStandalone()) return null;

  return (
    <div className="fixed inset-x-3 bottom-[84px] z-40 rounded-2xl border border-violet/40 bg-surface p-4 shadow-glow md:hidden" role="dialog" aria-label={`Install ${APP.name}`}>
      <button
        aria-label="Dismiss"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* private mode: just hide for this visit */
          }
          setHidden(true);
        }}
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-muted"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-8 font-bold">Get the {APP.name} app</p>
      <p className="mt-1 text-[13px] text-muted">
        Tap <Share className="mx-0.5 inline h-4 w-4 text-violet" /> Share, then <SquarePlus className="mx-0.5 inline h-4 w-4 text-violet" /> <b>Add to Home Screen</b>. It opens full-screen like a normal app.
      </p>
    </div>
  );
}
