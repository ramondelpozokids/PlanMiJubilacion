'use client';

import { useMemo, useState } from 'react';
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

type DateSort = 'desc' | 'asc';

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

function Stat({
  n,
  label,
  warn,
  money,
}: {
  n: number | string;
  label: string;
  warn?: boolean;
  money?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-3 text-center">
      <div
        className={`font-semibold tabular-nums ${money ? 'text-lg sm:text-xl' : 'text-2xl'} ${warn ? 'text-warning' : ''}`}
      >
        {n}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function DateSortToggle({
  value,
  onChange,
  label = 'Fecha',
}: {
  value: DateSort;
  onChange: (v: DateSort) => void;
  label?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="inline-flex rounded-md border bg-background p-0.5">
        <button
          type="button"
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === 'desc'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onChange('desc')}
        >
          Más reciente ↓
        </button>
        <button
          type="button"
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === 'asc'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onChange('asc')}
        >
          Más antigua ↑
        </button>
      </div>
    </div>
  );
}

function dmyKey(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = raw.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (!m) return 0;
  return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
}

function monthKey(raw: string | null | undefined): number {
  if (!raw) return 0;
  const m = raw.match(/(\d{2})[\/\-.](\d{4})/);
  if (!m) return 0;
  return Number(m[2]) * 12 + Number(m[1]);
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
  const [periodosSort, setPeriodosSort] = useState<DateSort>('desc');
  const [basesSort, setBasesSort] = useState<DateSort>('desc');
  const [prestacionesSort, setPrestacionesSort] = useState<DateSort>('desc');

  const sumaBases = expediente.bases.reduce((acc, b) => acc + (Number(b.base?.value) || 0), 0);
  const mediaBases =
    expediente.bases.length > 0 ? sumaBases / expediente.bases.length : null;

  const periodosSorted = useMemo(() => {
    const dir = periodosSort === 'asc' ? 1 : -1;
    return [...expediente.periodos].sort(
      (a, b) => (dmyKey(a.fechaAlta?.value) - dmyKey(b.fechaAlta?.value)) * dir
    );
  }, [expediente.periodos, periodosSort]);

  const basesSorted = useMemo(() => {
    const dir = basesSort === 'asc' ? 1 : -1;
    return [...expediente.bases].sort(
      (a, b) => (monthKey(a.periodo?.value) - monthKey(b.periodo?.value)) * dir
    );
  }, [expediente.bases, basesSort]);

  const prestacionesSorted = useMemo(() => {
    const dir = prestacionesSort === 'asc' ? 1 : -1;
    return [...expediente.prestaciones].sort(
      (a, b) => (dmyKey(a.fechaInicio?.value) - dmyKey(b.fechaInicio?.value)) * dir
    );
  }, [expediente.prestaciones, prestacionesSort]);

  return (
    <>
      {outlook && <RetirementOutlookCard outlook={outlook} />}
      {outlook && <Subsidio52Card outlook={outlook} />}

      <CollapsibleSection title="Resumen del expediente" defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Stat n={expediente.periodos.length} label="Periodos" />
          <Stat
            n={expediente.bases.length}
            label="Meses base"
            warn={expediente.bases.length === 0}
          />
          <Stat
            n={sumaBases > 0 ? formatCurrency(sumaBases) : '—'}
            label="Suma bases"
            money
            warn={sumaBases === 0}
          />
          <Stat n={expediente.prestaciones.length} label="Prestaciones" />
          <Stat n={expediente.resoluciones.length} label="Certificados" />
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
            <Val label="Días" field={expediente.resumen.diasRestantes} />
            <Val label="Días computables" field={expediente.resumen.totalDiasCotizacion} />
            <Val label="Fecha del informe" field={expediente.resumen.fechaInforme} />
            <Val label="Última base" field={expediente.resumen.baseMensualActual} />
            {expediente.resumen.diasPluriempleo?.value != null &&
              Number(expediente.resumen.diasPluriempleo.value) > 0 && (
                <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                  <p>
                    Para jubilación se usan los{' '}
                    <span className="font-medium text-foreground">
                      días efectivamente computables
                    </span>
                    {expediente.resumen.totalDiasCotizacion?.value != null
                      ? ` (${Number(expediente.resumen.totalDiasCotizacion.value).toLocaleString('es-ES')} días)`
                      : ''}
                    , no el total de días en alta
                    {expediente.resumen.diasAltaTotal?.value != null
                      ? ` (${Number(expediente.resumen.diasAltaTotal.value).toLocaleString('es-ES')})`
                      : ''}
                    . La diferencia (
                    {Number(expediente.resumen.diasPluriempleo.value).toLocaleString('es-ES')} días)
                    es pluriempleo o pluriactividad: periodos simultáneos que no se cuentan dos veces.
                  </p>
                </div>
              )}
            {sumaBases > 0 && (
              <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">Suma bases documentadas</span>
                <span className="text-right font-medium tabular-nums">
                  {formatCurrencyExact(sumaBases)}
                </span>
              </div>
            )}
            {mediaBases != null && (
              <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-sm last:border-0">
                <span className="text-muted-foreground">Media bases</span>
                <span className="text-right font-medium tabular-nums">
                  {formatCurrencyExact(mediaBases)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Periodos laborales" count={expediente.periodos.length}>
        {expediente.periodos.length === 0 ? (
          <EmptyHint text="Aún no hay periodos. Sube o relee la vida laboral." />
        ) : (
          <>
            <DateSortToggle value={periodosSort} onChange={setPeriodosSort} label="Orden por alta" />
            <ProTable
              headers={['Alta', 'Baja', 'Empresa', 'Régimen', 'Tipo', 'Días', 'Origen']}
              minWidth="min-w-[820px]"
            >
              {periodosSorted.map((p) => (
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
          </>
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
          <>
            <DateSortToggle
              value={prestacionesSort}
              onChange={setPrestacionesSort}
              label="Orden por inicio"
            />
            <ProTable
              headers={['Tipo', 'Inicio', 'Fin', 'Días', 'Importe', 'Origen']}
              minWidth="min-w-[640px]"
            >
              {prestacionesSorted.map((p) => (
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
          </>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Bases de cotización" count={expediente.bases.length}>
        {expediente.bases.length === 0 ? (
          <EmptyHint text="0 meses extraídos. En Documentos pulsa Releer en el informe de bases." />
        ) : (
          <>
            <div className="mb-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <p className="text-muted-foreground">
                Total bases documentadas (suma de los meses del informe)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatCurrencyExact(sumaBases)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {expediente.bases.length} meses
                  {mediaBases != null ? ` · media ${formatCurrencyExact(mediaBases)}` : ''}
                </span>
              </p>
            </div>
            <DateSortToggle value={basesSort} onChange={setBasesSort} label="Orden por periodo" />
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
          </>
        )}
      </CollapsibleSection>

      {intlResult && <InternationalCotizacionesReport result={intlResult} />}
    </>
  );
}
