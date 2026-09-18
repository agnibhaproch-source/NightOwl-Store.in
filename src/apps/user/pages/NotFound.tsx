import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { Page } from '../components/Page';

export default function NotFound() {
  const nav = useNavigate();
  return (
    <Page>
      <div className="pt-16">
        <EmptyState
          emoji="🦉"
          title="Nothing hooting here"
          body="This page wandered off. Probably went to find Maggi."
          action={<Button variant="primary" size="lg" onClick={() => nav('/')}>Take me home</Button>}
        />
      </div>
    </Page>
  );
}
