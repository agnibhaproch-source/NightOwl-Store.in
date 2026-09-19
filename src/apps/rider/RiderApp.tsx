import { useEffect } from 'react';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';
import { Button, Logo, Toaster } from '@/shared/ui';
import { BootScreen } from '@/shared/ui/BootScreen';
import { services } from '@/shared/services';
import { useRiderSession } from './hooks';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import type { Rider } from '@/shared/types';

function Shell({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <main id="main" className="safe-top safe-bottom mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo size={44} withText={false} />
      <span className="mt-8 grid h-16 w-16 place-items-center rounded-3xl bg-surface2">{icon}</span>
      <h1 className="mt-5 font-display text-3xl font-extrabold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-8 w-full space-y-2">{children}</div>
    </main>
  );
}

const signOut = (
  <Button block variant="outline" icon={<LogOut className="h-4 w-4" />} onClick={() => void services.riders.logout()}>Sign out</Button>
);

function Gate({ rider }: { rider: Rider }) {
  if (rider.status === 'approved') return <Dashboard rider={rider} />;
  if (rider.status === 'pending')
    return (
      <Shell icon={<Clock className="h-7 w-7 text-amber" />} title="Waiting for approval" body={`Thanks ${rider.name.split(' ')[0]}. The store is checking your details. This page updates by itself the moment you’re approved.`}>
        {signOut}
      </Shell>
    );
  return (
    <Shell
      icon={<ShieldAlert className="h-7 w-7 text-pink" />}
      title={rider.status === 'rejected' ? 'Application not approved' : 'Account paused'}
      body={rider.statusReason ? `Reason: ${rider.statusReason}` : 'Please contact the store to sort this out.'}
    >
      {signOut}
    </Shell>
  );
}

export default function RiderApp() {
  const session = useRiderSession();
  useEffect(() => {
    document.title = 'NightOwl Rider';
  }, []);

  let body: React.ReactNode;
  if (session.state === 'loading') body = <BootScreen />;
  else if (session.state === 'signedOut') body = <Auth />;
  else if (session.state === 'noProfile')
    body = (
      <Shell icon={<ShieldAlert className="h-7 w-7 text-amber" />} title="No rider profile" body={`${session.email || 'This account'} isn’t registered as a rider. Sign out and register with a rider email.`}>
        {signOut}
      </Shell>
    );
  else body = <Gate rider={session.rider} />;

  return (
    <>
      {body}
      <Toaster top />
    </>
  );
}
