'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function CollapsibleSection({
  title,
  count,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        'print-root overflow-hidden rounded-xl border bg-card',
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 border-b bg-muted/15 px-5 py-4 text-left transition-colors hover:bg-muted/25 print:pointer-events-none"
        aria-expanded={open}
      >
        <span className="text-base font-semibold tracking-tight">
          {title}
          {count != null && (
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              ({count})
            </span>
          )}
        </span>
        <Chevron className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      <div
        className={cn(
          'px-5 pb-5 pt-4',
          !open && 'hidden print:block'
        )}
      >
        {children}
      </div>
    </section>
  );
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-5 w-5 text-muted-foreground', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
