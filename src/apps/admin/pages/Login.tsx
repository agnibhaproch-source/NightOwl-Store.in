import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Mail } from 'lucide-react';
import { Blobs, Button, Logo } from '@/shared/ui';
import { services, errorMessage } from '@/shared/services';
import { APP } from '@/shared/config/app';
import { unlockAudio } from '@/shared/lib/sound';
import { toast } from '@/shared/store/toast';
import { useAdmin } from '../store/session';

export default function Login() {
  const login = useAdmin((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    unlockAudio();
    setBusy(true);
    setErr('');
    try {
      const s = await services.auth.adminLogin(email, password);
      login(s);
      toast({ title: `Welcome back, ${s.name.split(' ')[0]}`, emoji: '🦉' });
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main" className="relative grid min-h-dvh place-items-center px-4">
      <Blobs />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card relative w-full max-w-sm p-6 md:p-8">
        <div className="flex items-center justify-between">
          <Logo size={36} />
          <span className="rounded-md bg-violet/15 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-violet">Admin</span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-extrabold">Run the night shift</h1>
        <p className="mt-1 text-sm text-muted">Sign in to manage orders, stock and the store.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block">
            <span className="field-label">Email</span>
            <span className="relative block">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="field pl-10" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </span>
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="field pl-10" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </span>
          </label>
          <p className="min-h-[20px] text-sm text-pink" role="alert">{err}</p>
          <Button type="submit" variant="primary" size="lg" block loading={busy}>Sign in</Button>
        </form>
        <a href="/" className="mt-4 block text-center text-sm text-muted hover:text-fg">← Back to {APP.name}</a>
      </motion.div>
    </main>
  );
}
