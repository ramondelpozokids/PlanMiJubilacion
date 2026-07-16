'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PrintButton({
  label = 'Imprimir',
  className,
  variant = 'secondary',
}: {
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'accent';
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={cn('print:hidden', className)}
      onClick={() => window.print()}
    >
      <PrinterIcon className="h-4 w-4" />
      {label}
    </Button>
  );
}

export function ReportToolbar({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:block">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-muted-foreground mt-2 max-w-2xl text-sm sm:text-base">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
        {children}
        <PrintButton />
      </div>
    </div>
  );
}

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v8H6z" />
    </svg>
  );
}
