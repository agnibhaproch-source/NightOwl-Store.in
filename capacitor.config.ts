import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nightowl.hostel',
  appName: 'NightOwl',
  webDir: 'dist',
  backgroundColor: '#08080d',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Draw edge-to-edge and expose --safe-area-inset-* so headers (Skip, back buttons) clear the status bar.
    SystemBars: { insetsHandling: 'css', initialViewportFitValueHint: 'cover', style: 'DARK' },
    // Sign in with the OS's Google account / SMS, then hand the result to the web SDK (Firestore uses that session).
    FirebaseAuthentication: { skipNativeAuth: true, providers: ['google.com', 'phone'] }
  }
};

export default config;
