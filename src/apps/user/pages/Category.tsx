import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EmptyState, Button, IconButton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useCatalog } from '../hooks';
import { Page, PageHeader } from '../components/Page';
import { ProductGrid } from '../components/ProductLists';
import { FilterButton, FilterSheet, activeFilterCount, applyFilters, emptyFilters, type FilterState, type SortKey } from '../components/Filters';

const SORTS: SortKey[] = ['popular', 'price_asc', 'price_desc', 'discount', 'new'];

export default function CategoryPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { products, categories, loading } = useCatalog();
  const [filters, setFilters] = useState<FilterState>(() => emptyFilters());
  const [sheet, setSheet] = useState(false);
  const bar = useRef<HTMLDivElement>(null);
  const cat = categories.find((c) => c.id === id);

  useEffect(() => setFilters(emptyFilters()), [id]);
  useEffect(() => {
    bar.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [id, loading]);

  const inCat = useMemo(() => products.filter((p) => p.categoryId === id), [products, id]);
  const list = useMemo(() => applyFilters(inCat, filters), [inCat, filters]);

  if (!loading && !cat)
    return (
      <Page>
        <PageHeader title="Not found" />
        <EmptyState emoji="🧐" title="This aisle doesn't exist" body="It may have been removed by the store." action={<Button variant="primary" onClick={() => nav('/')}>Back home</Button>} />
      </Page>
    );

  return (
    <Page wide>
      <PageHeader
        title={cat ? `${cat.emoji} ${cat.name}` : '…'}
        sub={loading ? ' ' : `${inCat.length} item${inCat.length === 1 ? '' : 's'}`}
        right={
          <IconButton label="Search" onClick={() => nav('/search')}>
            <Search className="h-5 w-5" />
          </IconButton>
        }
      />
      {/* Sticky category bar */}
      <div className="glass sticky top-14 z-20 -mx-4 mb-4 border-b border-line/40 md:top-16 md:mx-0 md:rounded-2xl md:border">
        <div ref={bar} className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2" data-lenis-prevent-wheel>
          {categories.map((c) => {
            const on = c.id === id;
            return (
              <Link
                key={c.id}
                to={`/c/${c.id}`}
                replace
                aria-current={on ? 'page' : undefined}
                className={cn('relative flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors', on ? 'text-bg' : 'text-muted hover:text-fg')}
              >
                {on && <motion.span layoutId="cat-pill" className="absolute inset-0 rounded-xl bg-fg" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative" aria-hidden>{c.emoji}</span>
                <span className="relative">{c.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        <FilterButton count={activeFilterCount(filters)} onClick={() => setSheet(true)} />
        {SORTS.slice(0, 3).map((s) => (
          <button key={s} className="chip" aria-pressed={filters.sort === s} onClick={() => setFilters({ ...filters, sort: s })}>
            {s === 'popular' ? 'Popular' : s === 'price_asc' ? 'Price ↑' : 'Price ↓'}
          </button>
        ))}
        <button className="chip" aria-pressed={filters.vegOnly} onClick={() => setFilters({ ...filters, vegOnly: !filters.vegOnly })}>
          <span className="h-3 w-3 rounded-[3px] border-2 border-lime p-[1px]"><span className="block h-full w-full rounded-full bg-lime" /></span> Veg
        </button>
        <button className="chip" aria-pressed={filters.maxPrice === 50} onClick={() => setFilters({ ...filters, maxPrice: filters.maxPrice === 50 ? null : 50 })}>
          Under ₹50
        </button>
      </div>
      <ProductGrid
        products={list}
        loading={loading}
        empty={
          <EmptyState
            emoji="🫙"
            title="Nothing matches"
            body="Try removing a filter or two."
            action={<Button onClick={() => setFilters(emptyFilters())}>Clear filters</Button>}
          />
        }
      />
      <FilterSheet open={sheet} onClose={() => setSheet(false)} value={filters} onApply={setFilters} products={inCat} categories={categories} showCategories={false} sorts={SORTS} />
    </Page>
  );
}
