import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Product } from '@/shared/types';
import { Reveal, RevealItem } from '@/shared/ui';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

export function ProductGrid({ products, loading, empty }: { products: Product[]; loading?: boolean; empty?: ReactNode }) {
  if (loading)
    return (
      <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    );
  if (!products.length) return <>{empty}</>;
  return (
    <Reveal className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {products.map((p) => (
        <RevealItem key={p.id}>
          <ProductCard p={p} />
        </RevealItem>
      ))}
    </Reveal>
  );
}

export function ProductRail({
  title, note, products, loading, href
}: { title: string; note?: string; products: Product[]; loading?: boolean; href?: string }) {
  if (!loading && !products.length) return null;
  return (
    <section className="mt-9" aria-label={title}>
      <div className="mb-3 flex items-end justify-between gap-3 px-4 md:px-0">
        <div>
          <h2 className="text-[22px] font-extrabold">{title}</h2>
          {note && <p className="text-[13px] text-muted">{note}</p>}
        </div>
        {href && (
          <Link to={href} className="hit inline-flex shrink-0 items-center text-sm font-semibold text-violet">
            See all <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="no-scrollbar flex snap-x scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 md:scroll-px-0 md:px-0" data-lenis-prevent-wheel>
        {loading
          ? Array.from({ length: 5 }, (_, i) => <ProductCardSkeleton key={i} rail />)
          : products.map((p) => (
              <div key={p.id} className="snap-start">
                <ProductCard p={p} variant="rail" />
              </div>
            ))}
      </div>
    </section>
  );
}
