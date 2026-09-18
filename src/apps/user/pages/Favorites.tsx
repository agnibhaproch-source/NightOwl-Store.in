import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@/shared/ui';
import { useCatalog } from '../hooks';
import { useSession } from '../store/session';
import { Page, PageHeader } from '../components/Page';
import { ProductGrid } from '../components/ProductLists';

export default function Favorites() {
  const nav = useNavigate();
  const ids = useSession((s) => s.favorites);
  const { byId, loading } = useCatalog();
  const list = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p && p.active);
  return (
    <Page wide>
      <PageHeader title="Favourites" sub={loading ? ' ' : `${list.length} saved`} />
      <ProductGrid
        products={list}
        loading={loading}
        empty={<EmptyState emoji="💜" title="No favourites yet" body="Tap the heart on anything you love and it’ll live here." action={<Button variant="primary" onClick={() => nav('/')}>Find something</Button>} />}
      />
    </Page>
  );
}
