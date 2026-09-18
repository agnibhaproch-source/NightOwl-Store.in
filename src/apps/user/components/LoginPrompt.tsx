import { useLocation, useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';

export function LoginPrompt({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const nav = useNavigate();
  const loc = useLocation();
  return (
    <EmptyState
      emoji={emoji}
      title={title}
      body={body}
      action={<Button variant="primary" size="lg" onClick={() => nav('/login', { state: { from: loc.pathname } })}>Log in with phone</Button>}
    />
  );
}
