import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function ProTable({
  headers,
  children,
  minWidth,
}: {
  headers: string[];
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className={cn('w-full text-sm', minWidth)}>
        <thead>
          <tr className="border-b text-left">
            {headers.map((h) => (
              <th
                key={h}
                className="pb-2 pr-3 text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex max-w-[11rem] truncate rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium leading-5">
      {label}
    </span>
  );
}

export function ProductSection({
  title,
  count,
  children,
  actions,
}: {
  title: string;
  count?: number;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="print-root overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/15 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">
          {title}
          {count != null && (
            <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
              ({count})
            </span>
          )}
        </h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
