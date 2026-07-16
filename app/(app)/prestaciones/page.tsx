import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { getPlanMiProduct } from '@/lib/planmi/products';
import { ProductPageHeader, EmptyProductState } from '@/components/features/planmi-suite';
import { PrintButton } from '@/components/features/print-button';
import { CollapsibleSection } from '@/components/features/collapsible-section';
import { ProTable, TypeBadge } from '@/components/features/pro-table';
import { displayFileName, formatCurrency, humanizeTypeLabel } from '@/lib/utils';

export const metadata = { title: 'PlanMisPrestaciones', robots: { index: false } };

export default async function PrestacionesPage() {
  const product = getPlanMiProduct('prestaciones');
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);
  const prestaciones = expediente?.prestaciones ?? [];
  const resoluciones = expediente?.resoluciones ?? [];
  const empty = prestaciones.length === 0 && resoluciones.length === 0;

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
                Subir documentos
              </Button>
            </Link>
            <Link href="/analysis">
              <Button size="sm">Expediente completo</Button>
            </Link>
          </>
        }
      />

      <p className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Módulo en expansión: hoy muestra paro, subsidios y resoluciones ya fusionados en el
        expediente.
      </p>

      {empty ? (
        <EmptyProductState
          title="Sin prestaciones documentadas"
          description="Sube resoluciones SEPE, certificados de empresa o extractos de paro para verlos aquí."
        />
      ) : (
        <>
          <CollapsibleSection title="Prestaciones / paro" count={prestaciones.length}>
            {prestaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin prestaciones aún.</p>
            ) : (
              <ProTable
                headers={['Tipo', 'Inicio', 'Fin', 'Días', 'Importe', 'Origen']}
                minWidth="min-w-[640px]"
              >
                {prestaciones.map((p) => (
                  <tr key={p.id} className="border-b border-border/40 align-top">
                    <td className="py-2.5 pr-3">
                      <TypeBadge label={humanizeTypeLabel(p.tipo?.value)} />
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                      {p.fechaInicio?.value ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                      {p.fechaFin?.value ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">{p.dias?.value ?? '—'}</td>
                    <td className="py-2.5 pr-3 tabular-nums font-medium whitespace-nowrap">
                      {p.importe?.value != null ? formatCurrency(Number(p.importe.value)) : '—'}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">
                      {displayFileName(p.sources.map((s) => s.documentName).join(', ') || null)}
                    </td>
                  </tr>
                ))}
              </ProTable>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Certificados y resoluciones" count={resoluciones.length}>
            {resoluciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin certificados / resoluciones.</p>
            ) : (
              <ProTable
                headers={['Tipo', 'Organismo', 'Fecha', 'Resumen', 'Importe', 'Documento']}
                minWidth="min-w-[720px]"
              >
                {resoluciones.map((r) => (
                  <tr key={r.id} className="border-b border-border/40 align-top">
                    <td className="py-2.5 pr-3">
                      <TypeBadge label={humanizeTypeLabel(r.tipo?.value)} />
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{r.organismo?.value ?? '—'}</td>
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap">
                      {r.fecha?.value ?? '—'}
                    </td>
                    <td className="py-2.5 pr-3 max-w-[280px]">
                      <p className="line-clamp-2 leading-snug" title={r.resumen?.value ?? undefined}>
                        {r.resumen?.value && !r.resumen.value.endsWith('.pdf')
                          ? r.resumen.value
                          : r.resumen?.value
                            ? displayFileName(r.resumen.value)
                            : '—'}
                      </p>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums whitespace-nowrap font-medium">
                      {r.importe?.value != null ? formatCurrency(Number(r.importe.value)) : '—'}
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground max-w-[140px]">
                      <span title={r.sources[0]?.documentName}>
                        {displayFileName(r.sources[0]?.documentName)}
                      </span>
                    </td>
                  </tr>
                ))}
              </ProTable>
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
