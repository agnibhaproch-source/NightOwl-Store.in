/** Brand + contact config. Rename the app here. */
export const APP = {
  name: 'NightOwl',
  tagline: 'Late-night snacks, to your room',
  supportPhone: '+917001772488',
  supportWhatsApp: '917001772488',
  supportEmail: 'agnibhapro.ch@gmail.com',
  demoUserPhone: '9876543210',
  /** Firebase accounts allowed into /admin. No passwords live in the app: sign-in is real Firebase Auth and the database rules check this uid too. */
  adminAccounts: [{ uid: '0HRXjQ4GK6XdKkdJHm1tNVa6JyG2', name: 'Store Owner', role: 'owner' as const }],
  /** Seconds after placing an order in which a customer may still cancel it themselves. */
  cancelWindowSeconds: 30,
  /** UPI payee shown on the checkout QR screen, matching public/qr-code.jpg. */
  upiPayeeName: 'Agnibha Bhattacharya',
  upiId: 'agnibhapro.ch@okicici'
};
