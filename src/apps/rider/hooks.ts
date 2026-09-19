import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/shared/lib/firebase';
import { services } from '@/shared/services';
import { useLive } from '@/shared/hooks/live';
import type { Rider } from '@/shared/types';

export type RiderSession =
  | { state: 'loading' }
  | { state: 'signedOut' }
  | { state: 'noProfile'; email: string }
  | { state: 'ready'; rider: Rider };

/** The signed-in rider, straight from Firebase. Anonymous (customer) sessions never count. */
export function useRiderSession(): RiderSession {
  const [uid, setUid] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        if (!u) return;
        setUid(u.isAnonymous ? null : u.uid);
        setEmail(u.email ?? '');
      }),
    []
  );
  const [rider, loading] = useLive<Rider | null>(uid ? (cb) => services.riders.watchRider(uid, cb) : null, null, [uid]);
  if (uid === undefined || loading) return { state: 'loading' };
  if (!uid) return { state: 'signedOut' };
  if (!rider) return { state: 'noProfile', email };
  return { state: 'ready', rider };
}
