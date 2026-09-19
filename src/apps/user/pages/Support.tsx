import { useState } from 'react';
import { Headphones, Mail, MessageCircle, Phone, Send } from 'lucide-react';
import { Button, Input, Textarea } from '@/shared/ui';
import { toast } from '@/shared/store/toast';
import { APP } from '@/shared/config/app';
import { useCurrentUser } from '../hooks';
import { Page, PageHeader, Section } from '../components/Page';

const TOPICS = ['Order problem', 'Payment issue', 'Missing or damaged item', 'Feedback', 'Something else'];
const shown = APP.supportPhone.replace(/^\+91/, '').replace(/(\d{5})(\d{5})/, '$1 $2');

export default function Support() {
  const { customer } = useCurrentUser();
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const send = () => {
    const text = message.trim();
    if (text.length < 5) {
      toast.error('Write your message first', 'A few words about what went wrong is enough.');
      return;
    }
    const who = customer ? `\n\n— ${customer.name}${customer.phone ? `, +91 ${customer.phone}` : ''}` : '';
    const subj = `[${APP.name}] ${topic}${subject.trim() ? `: ${subject.trim()}` : ''}`;
    window.location.href = `mailto:${APP.supportEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text + who)}`;
    toast({ title: 'Opening your mail app', body: `Press send there to email ${APP.supportEmail}.`, emoji: '✉️', duration: 5000 });
  };

  return (
    <Page>
      <PageHeader title="Customer care" sub="We’re awake when you are" />
      <div className="space-y-4">
        <Section>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime/15 text-lime"><Headphones className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">Talk to us</p>
              <p className="text-[13px] text-muted">Fastest for anything about a live order.</p>
            </div>
          </div>
          <a href={`tel:${APP.supportPhone}`} className="mt-4 block">
            <Button variant="primary" size="lg" block icon={<Phone className="h-5 w-5" />}>Call {shown}</Button>
          </a>
          <a href={`https://wa.me/${APP.supportWhatsApp}`} target="_blank" rel="noreferrer" className="mt-2 block">
            <Button variant="outline" size="lg" block icon={<MessageCircle className="h-5 w-5" />}>Message on WhatsApp</Button>
          </a>
        </Section>

        <Section title={<span className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" /> Write to us</span>}>
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {TOPICS.map((t) => (
              <button key={t} className="chip" aria-pressed={topic === t} onClick={() => setTopic(t)}>{t}</button>
            ))}
          </div>
          <div className="space-y-3">
            <Input label="Subject (optional)" placeholder="e.g. Order 4821 arrived late" value={subject} maxLength={80} onChange={(e) => setSubject(e.target.value)} />
            <Textarea aria-label="Your message" placeholder="Tell us what happened. Include your order code if you have one." rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button variant="primary" size="lg" block icon={<Send className="h-5 w-5" />} onClick={send}>Send email</Button>
            <p className="text-[12px] text-muted">This opens your email app with everything filled in, addressed to {APP.supportEmail}. You can also write to that address directly.</p>
          </div>
        </Section>
      </div>
    </Page>
  );
}
