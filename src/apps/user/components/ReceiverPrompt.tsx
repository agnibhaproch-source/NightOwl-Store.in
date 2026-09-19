import { useEffect, useState } from 'react';
import { useCurrentUser } from '../hooks';
import { ReceiverSheet } from './ReceiverSheet';

const SKIP = 'no:receiver-skip';

/** Opens by itself when the app is launched and this account has no receiver details yet. */
export function ReceiverPrompt() {
  const { customer, loading } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const missing = !loading && !!customer && !customer.receiver;

  useEffect(() => {
    if (missing && !sessionStorage.getItem(SKIP)) {
      const t = setTimeout(() => setOpen(true), 1800);
      return () => clearTimeout(t);
    }
    if (!missing) setOpen(false);
  }, [missing]);

  if (!customer) return null;
  return (
    <ReceiverSheet
      open={open}
      customer={customer}
      skippable
      onClose={() => {
        sessionStorage.setItem(SKIP, '1');
        setOpen(false);
      }}
    />
  );
}
