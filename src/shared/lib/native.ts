import { Capacitor } from '@capacitor/core';

/** True inside the Android/iOS app shell (Capacitor), false in a normal browser or installed PWA. */
export const isNative = Capacitor.isNativePlatform();
export const nativePlatform = Capacitor.getPlatform();
