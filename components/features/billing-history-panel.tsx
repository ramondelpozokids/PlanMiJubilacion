'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPriceEur } from '@/lib/billing/pricing';
import type { BillingDocumentRow } from '@/lib/billing/repository';
import { deleteBillingDocumentsAction } from '@/app/(app)/informes/actions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TabKey = 'invoice' | 'receipt' | 'report_cover';
type SortDir = 'desc' | 'asc';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'invoice', label: 'Facturas' },
  { key: 'receipt', label: 'Recibos' },
  { key: 'report_cover', label: 'Portadas' },
];

function amountLabel(payload: Record<string, unknown>): string | null {
  return typeof payload.totalCents === 'number'
    ? formatPriceEur(payload.totalCents)
    : null;
}

export function BillingHistoryPanel({ documents }: { documents: BillingDocumentRow[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('invoice');
  const [sort, setSort] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);

  const counts = useMemo(() => {
    const c = { invoice: 0, receipt: 0, report_cover: 0 };
    for (const d of documents) {
      if (d.docType in c) c[d.docType as TabKey] += 1;
    }
    return c;
  }, [documents]);

  const visible = useMemo(() => {
    const list = documents.filter((d) => d.docType === tab);
    list.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sort === 'desc' ? tb - ta : ta - tb;
    });
    return list;
  }, [documents, tab, sort]);

  const allVisibleSelected =
    visible.length > 0 && visible.every((d) => selected.has(d.id));

  function switchTab(next: TabKey) {
    setTab(next);
    setSelected(new Set());
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        for (const d of visible) next.delete(d.id);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      for (const d of visible) next.add(d.id);
      return next;
    });
  }

  async function onDelete() {
    const ids = [...selected].filter((id) => visible.some((d) => d.id === id));
    if (ids.length === 0) {
      toast.error('Selecciona al menos un documento');
      return;
    }
    if (
      !window.confirm(
        `¿Borrar ${ids.length} documento${ids.length === 1 ? '' : 's'} de esta carpeta? No se puede deshacer.`
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const res = await deleteBillingDocumentsAction(ids);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(`Borrados: ${res.deleted}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al borrar');
    } finally {
      setPending(false);
    }
  }

  const selectedInTab = visible.filter((d) => selected.has(d.id)).length;

  return (
    <section className="rounded-xl border p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-xl">Facturas / Recibos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Guardados por tipo. Selecciona, ordena por fecha y borra lo que no necesites.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de documento">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => switchTab(t.key)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              tab === t.key
                ? 'border-accent bg-accent/10 text-accent font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums text-xs opacity-70">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={toggleSelectAll}
          disabled={visible.length === 0}
        >
          {allVisibleSelected ? 'Quitar selección' : 'Seleccionar todo'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sort === 'desc' ? 'primary' : 'secondary'}
          onClick={() => setSort('desc')}
        >
          Fecha ↓
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sort === 'asc' ? 'primary' : 'secondary'}
          onClick={() => setSort('asc')}
        >
          Fecha ↑
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={pending || selectedInTab === 0}
          className="ml-auto"
        >
          {pending ? 'Borrando…' : `Borrar${selectedInTab ? ` (${selectedInTab})` : ''}`}
        </Button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No hay {TABS.find((t) => t.key === tab)?.label.toLowerCase()} en el historial.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {visible.map((d) => {
            const amount = amountLabel(d.payload);
            const checked = selected.has(d.id);
            return (
              <li
                key={d.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3 transition-colors',
                  checked && 'border-accent/40 bg-accent/5'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOne(d.id)}
                  className="h-4 w-4 shrink-0 rounded border"
                  aria-label={`Seleccionar ${d.docNumber}`}
                />
                <Link
                  href={`/informes/${d.id}`}
                  className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2 hover:underline"
                >
                  <span className="font-medium truncate">{d.docNumber}</span>
                  <span className="text-muted-foreground shrink-0">
                    {amount ? `${amount} · ` : ''}
                    {new Date(d.createdAt).toLocaleString('es-ES')}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
