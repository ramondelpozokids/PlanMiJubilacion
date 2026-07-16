'use client';

import { Subsidio52Card } from '@/components/features/subsidio-52-card';
import { RetirementOutlookCard } from '@/components/features/retirement-outlook-card';
import { CollapsibleSection } from '@/components/features/collapsible-section';
import { ProTable, TypeBadge } from '@/components/features/pro-table';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import {
  displayFileName,
  formatCurrency,
  formatCurrencyExact,
  humanizeTypeLabel,
} from '@/lib/utils';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import { InternationalCotizacionesReport } from '@/components/features/international-cotizaciones-report';

function Val({ label, field }: { label: string; field: { value: unknown } | null | undefined }) {
  if (!field?.value && field?.value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{String(field.value)}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground py-4">{text}</p>;
}

function Stat({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-3 text-center">
      <div className={`text-2xl font-semibold tabular-nums ${warn ? 'text-warning' : ''}`}>
        {n}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function ExpedienteSections({
  expediente,
  outlook,
}: {
  expediente: ExpedienteDigital;
  outlook?: RetirementOutlook | null;
}) {
  const id = expediente.identificacion;
  const intlResult = evaluateInternationalCoordination(expediente.internationalCotizaciones);
  const basesSorted = [...expediente.bases].sort((a, b) => {
    const pa = a.periodo?.value ?? '';
    const pb = b.periodo?.value ?? '';
    const [ma, ya] = pa.split('/');
    const [mb, yb] = pb.split('/');
    return Number(yb) * 12 + Number(mb) - (Number(ya) * 12 + Number(ma));
  });

  return (
    <>
      {outlook && <RetirementOutlookCard outlook={outlook} />}
      {outlook && <Subsidio52Card outlook={outlook} />}

      <CollapsibleSection title="Resumen del expediente" defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Stat n={expediente.periodos.length} label="Periodos" />
          <Stat
            n={expediente.bases.length}
            label="Bases"
            warn={expediente.bases.length === 0}
          />
          <Stat n={expediente.prestaciones.length} label="Prestaciones" />
          <Stat n={expediente.resoluciones.length} label="Certificados" />
          <Stat n={expediente.lagunas.length} label="Lagunas" />
          <Stat n={expediente.documentIds.length} label="Documentos" />
        </div>
        {outlook?.pension.ordinaryResult && (
          <div className="mt-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <p className="text-muted-foreground">Pensión ordinaria estimada</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatCurrencyExact(outlook.pension.ordinaryResult.monthlyPension)}
              <span className="text-sm font-normal text-muted-foreground"> /mes</span>
            </p>
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Completitud {expediente.completitud.score}% · Fuente de verdad unificada
        </p>
      </CollapsibleSection>

      <CollapsibleSection title="Identificación y cotización">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Identificación
            </p>
            <Val label="Nombre" field={id.nombre} />
            <Val label="DNI" field={id.dni} />
            <Val label="NIE" field={id.nie} />
            <Val label="Nº afiliación" field={id.numeroAfiliacion} />
            <Val label="Fecha nacimiento" field={id.fechaNacimiento} />
            <Val label="Edad" field={id.edad} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Cotización
            </p>
            <Val label="Años cotizados" field={expediente.resumen.anosCotizados} />
            <Val label="Meses" field={expediente.resumen.mesesCotizados} />
            <Val label="Última base" field={expediente.resumen.baseMensualActual} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Periodos laborales" count={expediente.periodos.length}>
        {expediente.periodos.length === 0 ? (
          <EmptyHint text="Aún no hay periodos. Sube o relee la vida laboral." />
        ) : (
          <ProTable
            headers={['Alta', 'Baja', 'Empresa', 'Régimen', 'Tipo', 'Días', 'Origen']}
            minWidth="min-w-[820px]"
          >
            {expediente.periodos.map((p) => (
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

      <CollapsibleSection title="Certificados y resoluciones" count={expediente.resoluciones.length}>
        {expediente.resoluciones.length === 0 ? (
          <EmptyHint text="Sin certificados/resoluciones fusionados aún." />
        ) : (
          <ProTable
            headers={['Tipo', 'Organismo', 'Fecha', 'Resumen', 'Importe', 'Documento']}
            minWidth="min-w-[720px]"
          >
            {expediente.resoluciones.map((r) => (
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
                  {r.importe?.value != null
                    ? formatCurrencyExact(Number(r.importe.value))
                    : '—'}
                </td>
                <td className="py-2.5 text-xs text-muted-foreground max-w-[140px]">
                  {displayFileName(r.sources[0]?.documentName)}
                </td>
              </tr>
            ))}
          </ProTable>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Prestaciones / paro" count={expediente.prestaciones.length}>
        {expediente.prestaciones.length === 0 ? (
          <EmptyHint text="Sin prestaciones documentadas." />
        ) : (
          <ProTable
            headers={['Tipo', 'Inicio', 'Fin', 'Días', 'Importe', 'Origen']}
            minWidth="min-w-[640px]"
          >
            {expediente.prestaciones.map((p) => (
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
                  {p.importe?.value != null
                    ? formatCurrencyExact(Number(p.importe.value))
                    : '—'}
                </td>
                <td className="py-2.5 text-xs text-muted-foreground">
                  {displayFileName(p.sources.map((s) => s.documentName).join(', ') || null)}
                </td>
              </tr>
            ))}
          </ProTable>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Bases de cotización" count={expediente.bases.length}>
        {expediente.bases.length === 0 ? (
          <EmptyHint text="0 meses extraídos. En Documentos pulsa Releer en el informe de bases." />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto print:max-h-none">
            <ProTable headers={['Periodo', 'Base', 'Origen']} minWidth="min-w-[420px]">
              {basesSorted.map((b) => (
                <tr key={b.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 tabular-nums whitespace-nowrap font-medium">
                    {b.periodo?.value ?? '—'}
                  </td>
                  <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                    {b.base?.value != null
                      ? formatCurrencyExact(Number(b.base.value))
                      : '—'}
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

      {intlResult && <InternationalCotizacionesReport result={intlResult} />}
    </>
  );
}
