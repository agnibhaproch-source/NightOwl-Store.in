/** Brand + contact config. Rename the app here. */
export const APP = {
  name: 'NightOwl',
  tagline: 'Late-night snacks, to your room',
  supportPhone: '+919000000000',
  supportWhatsApp: '919000000000',
  supportEmail: 'help@nightowl.app',
  demoUserPhone: '9876543210',
  admins: [
    { email: 'owner@nightowl.app', password: 'owner123', name: 'Store Owner', role: 'owner' as const },
    { email: 'staff@nightowl.app', password: 'staff123', name: 'Night Staff', role: 'staff' as const }
  ],
  /** Seconds after placing an order in which a customer may still cancel it themselves. */
  cancelWindowSeconds: 30,
  /** UPI payee shown on the checkout QR screen, matching public/qr-code.jpg. */
  upiPayeeName: 'Agnibha Bhattacharya',
  upiId: 'agnibhapro.ch@okicici'
};
