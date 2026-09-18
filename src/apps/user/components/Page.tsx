import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IconButton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

/** Sub-page header with back button. Sticky on phones. */
export function PageHeader({ title, sub, right, back = true }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; back?: boolean | string }) {
  const nav = useNavigate();
  const goBack = () => {
    if (typeof back === 'string') nav(back);
    else if (window.history.state?.idx > 0) nav(-1);
    else nav('/');
  };
  return (
    <div className="glass safe-top sticky top-0 z-30 -mx-4 mb-4 border-b border-line/50 px-2 md:static md:mx-0 md:mb-6 md:border-0 md:bg-transparent md:px-0 md:backdrop-blur-0">
      <div className="flex h-14 items-center gap-1 md:h-auto md:pt-8">
        {back && (
          <IconButton label="Go back" onClick={goBack} className="md:-ml-3">
            <ArrowLeft className="h-5 w-5" />
          </IconButton>
        )}
        <div className={cn('min-w-0 flex-1', !back && 'pl-2 md:pl-0')}>
          <h1 className="truncate text-xl font-extrabold md:text-[32px] md:leading-tight">{title}</h1>
          {sub && <p className="truncate text-[13px] text-muted md:text-sm">{sub}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center gap-1">{right}</div>}
      </div>
    </div>
  );
}

export function Page({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <main id="main" className={cn('mx-auto w-full px-4 pb-40 md:px-6 md:pb-24', wide ? 'max-w-6xl' : 'max-w-3xl', className)}>{children}</main>;
}

export function Section({ title, action, children, className, flush }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cn('card', !flush && 'p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-[17px] font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
