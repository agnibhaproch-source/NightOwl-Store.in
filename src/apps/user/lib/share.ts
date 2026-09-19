import { Share } from '@capacitor/share';
import { APP } from '@/shared/config/app';
import { isNative } from '@/shared/lib/native';
import { toast } from '@/shared/store/toast';

/** The public address people should open. Set VITE_PUBLIC_URL once the site is deployed (needed inside the Android app). */
const siteUrl = (import.meta.env.VITE_PUBLIC_URL as string | undefined) || (isNative ? undefined : window.location.origin);

export async function shareApp() {
  const text = `${APP.name}: ${APP.tagline}. Maggi, chips, cold drinks and more delivered to your hostel room, 9 PM to 2 AM.`;
  try {
    const { value } = await Share.canShare();
    if (value) {
      await Share.share({ title: APP.name, text, url: siteUrl, dialogTitle: `Share ${APP.name}` });
      return;
    }
  } catch (e) {
    if ((e as Error)?.message?.toLowerCase().includes('cancel')) return;
  }
  try {
    await navigator.clipboard.writeText(siteUrl ? `${text} ${siteUrl}` : text);
    toast({ title: 'Link copied', body: 'Paste it in any chat to share.', emoji: '🔗' });
  } catch {
    toast.error('Couldn’t share', siteUrl ?? 'Try again in a moment.');
  }
}
