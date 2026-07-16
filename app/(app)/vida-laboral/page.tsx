import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { expedienteDataStats } from '@/lib/calculator/from-expediente';
import { getPlanMiProduct } from '@/lib/planmi/products';
import { ProductPageHeader, EmptyProductState } from '@/components/features/planmi-suite';
import { PrintButton } from '@/components/features/print-button';
import { CollapsibleSection } from '@/components/features/collapsible-section';
import { ProTable, TypeBadge } from '@/components/features/pro-table';
import { displayFileName, formatCurrency, humanizeTypeLabel } from '@/lib/utils';

export const metadata = { title: 'PlanMiVidaLaboral', robots: { index: false } };

export default async function VidaLaboralPage() {
  const product = getPlanMiProduct('vida-laboral');
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);
  const stats = expediente ? expedienteDataStats(expediente) : null;
  const periodos = expediente?.periodos ?? [];
  const bases = [...(expediente?.bases ?? [])].sort((a, b) => {
    const pa = a.periodo?.value ?? '';
    const pb = b.periodo?.value ?? '';
    const [ma, ya] = pa.split('/');
    const [mb, yb] = pb.split('/');
    return Number(yb) * 12 + Number(mb) - (Number(ya) * 12 + Number(ma));
  });

  const empty = !expediente || (periodos.length === 0 && bases.length === 0);

  return (
    <div className="space-y-6 print-root max-w-7xl">
      <ProductPageHeader
        name={product.name}
        tagline={product.tagline}
        actions={
          <>
            <PrintButton label="Imprimir" />
            <Link href="/upload">
              <Button size="sm" variant="secondary">
                Subir / releer
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="sm">Expediente</Button>
            </Link>
          </>
        }
      />

      {empty ? (
        <EmptyProductState
          title="Sin historial laboral"
          description="Sube el informe de vida laboral y el de bases de cotización para analizar tu carrera."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Años</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {expediente?.resumen.anosCotizados?.value ?? '—'}
              </p>
              {expediente?.resumen.mesesCotizados?.value != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  + {expediente.resumen.mesesCotizados.value} meses
                </p>
              )}
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bases</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">
                {stats?.basesDocumentadas ?? 0}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stats?.primeraBase && stats?.ultimaBase
                  ? `${stats.primeraBase} → ${stats.ultimaBase}`
                  : 'Sin rango'}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Periodos</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums">{periodos.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">Altas / bajas documentadas</p>
            </div>
          </div>

          <CollapsibleSection title="Periodos laborales" count={periodos.length}>
            {periodos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin periodos. Relee la vida laboral.</p>
            ) : (
              <ProTable
                headers={['Alta', 'Baja', 'Empresa', 'Régimen', 'Tipo', 'Días', 'Origen']}
                minWidth="min-w-[820px]"
              >
                {periodos.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 align-top">
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                      {p.fechaAlta?.value ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                      {p.fechaBaja?.value ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3">{p.empresa?.value ?? '—'}</td>
                    <td className="py-2.5 pr-3">{p.regimen?.value ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      <TypeBadge label={humanizeTypeLabel(p.categoria)} />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.diasCotizados?.value ?? '—'}</td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {displayFileName(
                        p.sources.map((s) => s.documentName).filter(Boolean).join(', ') || null
                      )}
                    </td>
                  </tr>
                ))}
              </ProTable>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Bases de cotización" count={bases.length}>
            {bases.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                0 meses. En Documentos pulsa Releer en el informe de bases.
              </p>
            ) : (
              <div className="max-h-[32rem] overflow-y-auto print:max-h-none">
                <ProTable headers={['Periodo', 'Base', 'Origen']} minWidth="min-w-[420px]">
                  {bases.map((b) => (
                    <tr key={b.id} className="border-b border-border/40">
                      <td className="py-2 pr-3 tabular-nums whitespace-nowrap font-medium">
                        {b.periodo?.value ?? '—'}
                      </td>
                      <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                        {b.base?.value != null ? formatCurrency(Number(b.base.value)) : '—'}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {displayFileName(b.sources[0]?.documentName)}
                      </td>
                    </tr>
                  ))}
                </ProTable>
              </div>
            )}
          </CollapsibleSection>
        </>
      )}

      <p className="print-footer">
        {product.name} · {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}
