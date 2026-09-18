import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowUpLeft, Clock, Search as SearchIcon, TrendingUp, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, EmptyState, IconButton, PackShot } from '@/shared/ui';
import { useDebounced } from '@/shared/hooks/misc';
import { searchProducts } from '@/shared/lib/search';
import { inr } from '@/shared/lib/format';
import { useCatalog } from '../hooks';
import { useSession } from '../store/session';
import { useUi } from '../store/ui';
import { Page } from '../components/Page';
import { ProductGrid } from '../components/ProductLists';
import { FilterButton, FilterSheet, activeFilterCount, applyFilters, emptyFilters, type FilterState, type SortKey } from '../components/Filters';

const SORTS: SortKey[] = ['relevance', 'popular', 'price_asc', 'price_desc', 'discount', 'new'];
const POPULAR = ['Maggi', 'Red Bull', 'Lay’s', 'Dairy Milk', 'Coke', 'Buldak', 'Oreo', 'Kurkure'];

function highlight(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-fg">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { products, categories, loading } = useCatalog();
  const recent = useSession((s) => s.recentSearches);
  const addSearch = useSession((s) => s.addSearch);
  const clearSearches = useSession((s) => s.clearSearches);
  const openProduct = useUi((s) => s.openProduct);
  const input = useRef<HTMLInputElement>(null);

  const q = params.get('q') ?? '';
  const [text, setText] = useState(q);
  const browsing = !!(params.get('sort') || params.get('max'));
  const [focused, setFocused] = useState(!q && !browsing);
  const [sheet, setSheet] = useState(false);
  const initialSort = (params.get('sort') as SortKey | null) ?? (q ? 'relevance' : 'popular');
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...emptyFilters(initialSort),
    maxPrice: params.get('max') ? Number(params.get('max')) : null
  }));
  const debounced = useDebounced(text.trim(), 120);

  useEffect(() => setText(q), [q]);
  useEffect(() => {
    if (!q && !browsing) input.current?.focus();
  }, [q, browsing]);

  const suggestions = useMemo(
    () => (debounced.length >= 1 ? searchProducts(products, categories, debounced).slice(0, 6) : []),
    [debounced, products, categories]
  );
  const matchedCats = useMemo(
    () => (debounced.length >= 2 ? categories.filter((c) => c.name.toLowerCase().includes(debounced.toLowerCase())) : []),
    [debounced, categories]
  );

  const base = useMemo(() => (q ? searchProducts(products, categories, q) : products), [q, products, categories]);
  const results = useMemo(() => {
    const f = !q && filters.sort === 'relevance' ? { ...filters, sort: 'popular' as SortKey } : filters;
    return applyFilters(base, f);
  }, [base, filters, q]);

  const commit = (value: string) => {
    const v = value.trim();
    if (v) addSearch(v);
    setParams(v ? { q: v } : {}, { replace: true });
    setText(v);
    setFocused(false);
    input.current?.blur();
    if (v && filters.sort === 'popular') setFilters((f) => ({ ...f, sort: 'relevance' }));
  };

  const showPanel = focused;
  const typoNote = q && results.length > 0 && !results.some((p) => `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <Page wide>
      <div className="glass safe-top sticky top-0 z-30 -mx-4 border-b border-line/50 px-3 py-2 md:top-16 md:mx-0 md:mt-6 md:rounded-2xl md:border">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            commit(text);
          }}
          className="flex items-center gap-1"
        >
          <IconButton label="Go back" onClick={() => (focused && q ? setFocused(false) : nav(-1))} className="md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl border border-line bg-surface px-3 focus-within:border-violet">
            <SearchIcon className="h-5 w-5 shrink-0 text-violet" />
            <input
              ref={input}
              type="search"
              enterKeyHint="search"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setFocused(true);
              }}
              onFocus={() => setFocused(true)}
              placeholder="Search maggi, chips, energy drinks…"
              aria-label="Search products"
              aria-autocomplete="list"
              aria-controls="search-suggest"
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted/80 [&::-webkit-search-cancel-button]:hidden"
            />
            {text && (
              <button type="button" aria-label="Clear search" onClick={() => { setText(''); input.current?.focus(); setFocused(true); }} className="grid h-8 w-8 place-items-center rounded-full bg-surface2">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {showPanel ? (
          <motion.div key="panel" id="search-suggest" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-4">
            {text.trim() === '' ? (
              <div className="space-y-7">
                {recent.length > 0 && (
                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-[15px] font-bold">Recent searches</h2>
                      <button onClick={clearSearches} className="hit text-sm font-semibold text-muted hover:text-fg">Clear</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <button key={r} className="chip" onClick={() => commit(r)}>
                          <Clock className="h-3.5 w-3.5 text-muted" /> {r}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                <section>
                  <h2 className="mb-2 text-[15px] font-bold">Popular tonight</h2>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR.map((r) => (
                      <button key={r} className="chip" onClick={() => commit(r)}>
                        <TrendingUp className="h-3.5 w-3.5 text-lime" /> {r}
                      </button>
                    ))}
                  </div>
                </section>
                <section>
                  <h2 className="mb-2 text-[15px] font-bold">Browse aisles</h2>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {categories.map((c) => (
                      <button key={c.id} onClick={() => nav(`/c/${c.id}`)} className="flex h-14 items-center gap-2 rounded-2xl border border-line/60 bg-surface px-3 text-left font-semibold hover:border-line">
                        <span className="text-2xl" aria-hidden>{c.emoji}</span> {c.name}
                      </button>
                    ))}
                  </div>
                </section>
                {q && <Button onClick={() => setFocused(false)}>Back to results for “{q}”</Button>}
              </div>
            ) : (
              <ul role="listbox" aria-label="Suggestions" className="card divide-y divide-line/50 overflow-hidden p-0">
                {matchedCats.map((c) => (
                  <li key={c.id} role="option" aria-selected={false}>
                    <button onClick={() => nav(`/c/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface2">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface2 text-2xl">{c.emoji}</span>
                      <span className="flex-1"><span className="block font-semibold">{c.name}</span><span className="text-[12px] text-muted">Category</span></span>
                    </button>
                  </li>
                ))}
                {suggestions.map((p) => (
                  <li key={p.id} role="option" aria-selected={false}>
                    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface2">
                      <button onClick={() => openProduct(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="h-11 w-11 shrink-0 rounded-xl p-1" style={{ background: `${p.color}22` }}><PackShot product={p} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-muted">{highlight(p.name, debounced)}</span>
                          <span className="text-[12px] text-muted">{p.unit} · {p.stock > 0 ? inr(p.price) : 'Out of stock'}</span>
                        </span>
                      </button>
                      <IconButton label={`Search for ${p.name}`} onClick={() => commit(p.name)}>
                        <ArrowUpLeft className="h-4 w-4 text-muted" />
                      </IconButton>
                    </div>
                  </li>
                ))}
                <li>
                  <button onClick={() => commit(text)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left font-semibold text-violet hover:bg-surface2">
                    <SearchIcon className="h-4 w-4" /> See all results for “{text.trim()}”
                  </button>
                </li>
              </ul>
            )}
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="pt-4">
            <div className="mb-3 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-muted" aria-live="polite">
                {q ? <>{results.length} result{results.length === 1 ? '' : 's'} for <b className="text-fg">“{q}”</b></> : <>All products · {results.length}</>}
              </p>
              <FilterButton count={activeFilterCount(filters)} onClick={() => setSheet(true)} />
            </div>
            {typoNote && <p className="mb-3 rounded-xl bg-violet/10 px-3 py-2 text-[13px] text-violet">No exact match, showing the closest ones.</p>}
            <ProductGrid
              products={results}
              loading={loading}
              empty={
                <EmptyState
                  emoji="🔍"
                  title={q ? `No “${q}” tonight` : 'Nothing here'}
                  body={activeFilterCount(filters) ? 'Some filters are on. Try clearing them.' : 'Try a brand like Maggi or Lay’s, or browse a category.'}
                  action={
                    activeFilterCount(filters) ? (
                      <Button onClick={() => setFilters(emptyFilters(filters.sort))}>Clear filters</Button>
                    ) : (
                      <Button onClick={() => { setText(''); setFocused(true); }}>Browse categories</Button>
                    )
                  }
                />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
      <FilterSheet open={sheet} onClose={() => setSheet(false)} value={filters} onApply={setFilters} products={base} categories={categories} sorts={q ? SORTS : SORTS.slice(1)} />
    </Page>
  );
}
