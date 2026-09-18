import { useParams } from 'react-router-dom';
import { APP } from '@/shared/config/app';
import { Page, PageHeader } from '../components/Page';

const DOCS: Record<string, { title: string; updated: string; sections: [string, string][] }> = {
  terms: {
    title: 'Terms of service',
    updated: 'September 2026',
    sections: [
      ['Who we are', `${APP.name} is a late-night delivery service for students living in campus hostels. We sell sealed, packaged snacks and beverages only.`],
      ['Eligibility', 'You need a valid Indian mobile number and a room in one of the hostels we serve. Accounts are personal. Don’t share your login.'],
      ['Orders and pricing', 'Prices are shown in rupees and include applicable taxes. Selling prices may be lower than MRP; they will never be higher. Delivery and platform fees are shown in your bill before you pay.'],
      ['Availability', 'Stock is limited and updated live. If an item sells out after you order, we will call you and adjust or cancel it.'],
      ['Payment', 'Orders are paid upfront by scanning our UPI QR code at checkout. We only send your order to the store once payment is confirmed.'],
      ['Cancellations', 'You can cancel within a short window of placing your order. The store may also cancel orders it cannot fulfil, and will tell you why.'],
      ['Conduct', 'Be kind to riders and staff. Abuse, fake orders or repeated no-shows can get your account blocked.'],
      ['Liability', 'We deliver sealed products as supplied by their manufacturers. Check expiry dates and allergen info on the pack before eating.'],
      ['Contact', `Questions? ${APP.supportEmail}`]
    ]
  },
  privacy: {
    title: 'Privacy policy',
    updated: 'September 2026',
    sections: [
      ['What we collect', 'Your name, phone number, hostel, block and room, your orders, and the notification preferences you choose.'],
      ['Why', 'To deliver your orders, show your history, send updates you asked for and improve what we stock.'],
      ['What we don’t do', 'We don’t sell your data, and we don’t track your location. There are no maps; you pick your room yourself.'],
      ['Notifications', 'Push notifications are optional and can be turned off per type in Settings or in your browser.'],
      ['Storage', 'Some data like your cart and preferences is kept on your device so the app works quickly and offline.'],
      ['Your choices', `You can edit your name and rooms any time. To delete your account, email ${APP.supportEmail} from your registered number’s owner.`]
    ]
  }
};

export default function Legal() {
  const { doc = 'terms' } = useParams();
  const d = DOCS[doc] ?? DOCS.terms!;
  return (
    <Page>
      <PageHeader title={d.title} sub={`Last updated ${d.updated}`} />
      <article className="card space-y-5 p-5">
        {d.sections.map(([h, body]) => (
          <section key={h}>
            <h2 className="text-lg font-bold">{h}</h2>
            <p className="mt-1 text-muted">{body}</p>
          </section>
        ))}
      </article>
    </Page>
  );
}
