import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, FileText, Mail, MessageCircle, Phone, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '@/shared/hooks/live';
import { hmLabel } from '@/shared/lib/time';
import { inr } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { APP } from '@/shared/config/app';
import { Page, PageHeader } from '../components/Page';

export default function Help() {
  const [s] = useSettings();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: 'When are you open?', a: `Every night from ${hmLabel(s.openTime)} to ${hmLabel(s.closeTime)}. You can browse and fill your cart any time, ordering unlocks when we open. The store may occasionally open late or close early, the banner at the top always shows the live status.` },
    { q: 'How long does delivery take?', a: `Usually ${s.etaMin}–${s.etaMax} minutes. We pack from a store on campus and walk it to your block.` },
    { q: 'Where do you deliver?', a: `Only to ${s.hostels.filter((h) => h.active).map((h) => `${h.name} (${h.short})`).join(', ')}. Pick your hostel, block and room at checkout.` },
    { q: 'How do I pay?', a: 'Scan our UPI QR code at checkout and pay before the order is sent to the store. There is no pay-on-delivery.' },
    { q: 'What are the fees?', a: `Delivery is ${inr(s.deliveryFee)} on every order, it's never free. A ${inr(s.convenienceFee)} platform fee also applies to every order. Minimum order is ${inr(s.minOrderValue)}.` },
    { q: 'Can I cancel my order?', a: `Yes, within ${APP.cancelWindowSeconds} seconds of placing it. Open the order and tap Cancel. After that, call us and we will try our best.` },
    { q: 'Do you sell cooked food?', a: 'No. Only sealed, packaged items: instant noodles, chips, biscuits, cakes, cold drinks, pasta and chocolate.' },
    { q: 'Something was missing or damaged', a: 'Sorry about that. Call or WhatsApp us with your order ID and we will sort it out tonight.' },
    { q: 'How do back-in-stock alerts work?', a: 'Tap “Notify me” on a sold-out item. When the store restocks it, you get a notification right away.' }
  ];
  return (
    <Page>
      <PageHeader title="Help & support" sub="We’re awake when you are" />
      <section className="grid grid-cols-3 gap-2">
        {[
          { icon: Phone, label: 'Call', href: `tel:${APP.supportPhone}`, tone: 'text-lime bg-lime/15' },
          { icon: MessageCircle, label: 'WhatsApp', href: `https://wa.me/${APP.supportWhatsApp}`, tone: 'text-cyan bg-cyan/15' },
          { icon: Mail, label: 'Email', href: `mailto:${APP.supportEmail}`, tone: 'text-violet bg-violet/15' }
        ].map((c) => (
          <a key={c.label} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="card flex flex-col items-center gap-2 p-4 transition-transform active:scale-95">
            <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', c.tone)}><c.icon className="h-5 w-5" /></span>
            <span className="text-sm font-semibold">{c.label}</span>
          </a>
        ))}
      </section>
      <Link to="/support" className="card mt-3 flex items-center justify-between p-4 font-semibold">Write to customer care <span className="text-violet">Open</span></Link>
      <h2 className="mb-3 mt-8 text-[22px] font-extrabold">FAQ</h2>
      <ul className="card divide-y divide-line/50 overflow-hidden">
        {faqs.map((f, i) => {
          const on = open === i;
          return (
            <li key={f.q}>
              <h3>
                <button
                  onClick={() => setOpen(on ? null : i)}
                  aria-expanded={on}
                  aria-controls={`faq-${i}`}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left font-semibold"
                >
                  <span className="flex-1">{f.q}</span>
                  <motion.span animate={{ rotate: on ? 180 : 0 }}><ChevronDown className="h-5 w-5 text-muted" /></motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {on && (
                  <motion.div id={`faq-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="px-4 pb-4 text-muted">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex gap-2">
        <Link to="/legal/terms" className="chip"><FileText className="h-4 w-4" /> Terms</Link>
        <Link to="/legal/privacy" className="chip"><Shield className="h-4 w-4" /> Privacy</Link>
      </div>
    </Page>
  );
}
