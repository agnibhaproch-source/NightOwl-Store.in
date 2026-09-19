import { Download, Share, SquarePlus, Smartphone } from 'lucide-react';
import { Button } from '@/shared/ui';
import { toast } from '@/shared/store/toast';
import { APP } from '@/shared/config/app';
import { useInstall, isIOS } from '../lib/install';
import { Page, PageHeader, Section } from '../components/Page';

export default function GetApp() {
  const install = useInstall();
  const ios = isIOS();

  const installPwa = async () => {
    if (install.canPrompt) {
      const ok = await install.prompt();
      if (ok) toast.success(`${APP.name} installed`);
    } else {
      toast({ title: 'Already installed, or not supported here', body: 'Try opening this page in Chrome if the button did nothing.', emoji: '📲' });
    }
  };

  return (
    <Page>
      <PageHeader title="Get the app" sub="Faster, full-screen, works even when your signal is weak" />

      <div className="space-y-4">
        <Section title="Android">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><Download className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Download the app</p>
              <p className="text-[13px] text-muted">A direct install, not from the Play Store yet. Android will warn you it's from an unknown source — tap "Install anyway".</p>
            </div>
          </div>
          <a href="/downloads/nightowl.apk" download className="mt-4 block">
            <Button variant="primary" size="lg" block icon={<Download className="h-5 w-5" />}>Download APK</Button>
          </a>

          <div className="my-4 flex items-center gap-3 text-[12px] text-muted">
            <div className="h-px flex-1 bg-line" /> or, no download needed <div className="h-px flex-1 bg-line" />
          </div>

          <Button variant="outline" size="lg" block icon={<Smartphone className="h-5 w-5" />} onClick={installPwa}>
            Install the lightweight web app
          </Button>
        </Section>

        <Section title="iPhone &amp; iPad">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet/15 text-violet"><Smartphone className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Add to Home Screen</p>
              <p className="text-[13px] text-muted">Apple doesn’t allow installing an app from a file, and we’re not on the App Store yet. Adding it from Safari gives you the same full-screen app with its own icon.</p>
            </div>
          </div>
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 text-[13px] font-bold">1</span>
              Open this site in <b>Safari</b>, then tap the <Share className="mx-1 inline h-4 w-4" /> Share button
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 text-[13px] font-bold">2</span>
              Scroll down and tap <SquarePlus className="mx-1 inline h-4 w-4" /> <b>Add to Home Screen</b>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface2 text-[13px] font-bold">3</span>
              Tap <b>Add</b> — {APP.name} now opens full-screen from your Home Screen
            </li>
          </ol>
          {!ios && <p className="mt-3 text-[12px] text-muted">You're not on an iPhone right now, but these steps work the same way in Safari on one.</p>}
        </Section>
      </div>
    </Page>
  );
}
