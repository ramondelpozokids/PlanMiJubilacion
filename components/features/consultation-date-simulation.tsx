'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import {
  buildDateSimulation,
  buildComparisonTable,
  PENSION_ANNUAL_PAYMENTS,
  type DateSimulationRow,
} from '@/lib/asesoria-wizard/simulate-at-date';
import { SimulationCalculationBreakdown } from '@/components/features/asesoria-wizard/simulation-calculation-breakdown';
import { formatCurrencyExact } from '@/lib/utils';

const IRPF_PRESETS = [
  { label: '0 %', value: 0 },
  { label: '2 %', value: 0.02 },
  { label: '8 %', value: 0.08 },
  { label: '15 %', value: 0.15 },
  { label: '19 %', value: 0.19 },
  { label: '24 %', value: 0.24 },
];

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function Metric({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasize?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${emphasize ? 'bg-muted/40 border-foreground/20' : 'bg-background'}`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${emphasize ? 'text-2xl' : 'text-xl'}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ConsultationDateSimulation({
  expediente,
  lifePath,
  clientName,
  defaultDateIso,
}: {
  expediente: ExpedienteDigital;
  lifePath: LifePathAssumptions;
  clientName: string;
  /** Fecha inicial sugerida (ordinaria), YYYY-MM-DD */
  defaultDateIso?: string | null;
}) {
  const todayIso = toDateInputValue(new Date());
  const [dateIso, setDateIso] = useState(defaultDateIso || todayIso);
  const [irpfPct, setIrpfPct] = useState(0);
  const [involuntary, setInvoluntary] = useState(false);

  const irpfRetention = Math.min(50, Math.max(0, irpfPct)) / 100;

  const row: DateSimulationRow | null = useMemo(() => {
    const date = parseLocalDate(dateIso);
    if (!date) return null;
    return buildDateSimulation(expediente, date, {
      lifePath,
      irpfRetention,
      declareInvoluntaryCause: involuntary,
    });
  }, [dateIso, expediente, lifePath, irpfRetention, involuntary]);

  const comparison = useMemo(
    () =>
      buildComparisonTable(expediente, {
        lifePath,
        irpfRetention,
        declareInvoluntaryCause: involuntary,
      }),
    [expediente, lifePath, irpfRetention, involuntary]
  );

  return (
    <Card className="border-2 border-foreground/15 print-root">
      <CardHeader>
        <CardTitle className="text-lg">
          Simulación a fecha · {clientName}
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Elige la fecha de jubilación (como en la Seguridad Social): verás la pensión bruta, el %
          que le quitan por anticipada, las {PENSION_ANNUAL_PAYMENTS} pagas anuales y el neto tras
          IRPF orientativo.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted-foreground">Fecha de jubilación</span>
            <input
              type="date"
              value={dateIso}
              min={todayIso}
              onChange={(e) => setDateIso(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">IRPF retención (%)</span>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={irpfPct}
              onChange={(e) => setIrpfPct(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <div className="flex flex-wrap gap-1">
              {IRPF_PRESETS.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant={Math.abs(irpfPct - p.value * 100) < 0.01 ? 'primary' : 'secondary'}
                  onClick={() => setIrpfPct(p.value * 100)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm print:hidden">
          <input
            type="checkbox"
            checked={involuntary}
            onChange={(e) => setInvoluntary(e.target.checked)}
            className="rounded"
          />
          Causa involuntaria acreditada (art. 207 LGSS — coeficientes distintos)
        </label>

        {!row ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Faltan fecha de nacimiento o años cotizados en el expediente para simular.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric
                label="Fecha elegida"
                value={row.retirementDateLabel}
                hint={`${row.modalityLabel} · ${row.age} años`}
              />
              <Metric
                label="Reducción SS"
                value={row.reductionPercent > 0 ? `−${row.reductionPercent} %` : '0 %'}
                hint={
                  row.monthsEarly > 0
                    ? `${row.monthsEarly} meses de anticipación (tablas BOE)`
                    : 'Sin anticipación'
                }
              />
              <Metric
                label="Pagas anuales"
                value={String(row.annualPayments)}
                hint="Pensión contributiva (14 pagas)"
              />
              <Metric
                label="Pensión bruta / mes"
                value={
                  row.monthlyPension != null ? formatCurrencyExact(row.monthlyPension) : '—'
                }
                hint={
                  row.baseReguladora != null
                    ? `BR ${formatCurrencyExact(row.baseReguladora)}` +
                      (row.percentageByYears != null
                        ? ` · ${row.percentageByYears.toFixed(1)} %`
                        : '')
                    : undefined
                }
              />
              <Metric
                label="Bruto anual (14 pagas)"
                value={
                  row.annualPension != null ? formatCurrencyExact(row.annualPension) : '—'
                }
              />
              <Metric
                label="IRPF / mes"
                value={
                  row.irpfMonthly != null
                    ? formatCurrencyExact(row.irpfMonthly)
                    : '—'
                }
                hint={`${(row.irpfRetention * 100).toFixed(1)} % retención orientativa`}
              />
              <Metric
                label="Neto / mes"
                value={row.netMonthly != null ? formatCurrencyExact(row.netMonthly) : '—'}
                emphasize
                hint="Lo que quedaría tras la retención indicada"
              />
              <Metric
                label="Neto anual (14 pagas)"
                value={row.netAnnual != null ? formatCurrencyExact(row.netAnnual) : '—'}
                emphasize
              />
            </div>

            {row.calculation?.ordinaryMonthlyBeforeReduction != null &&
              row.reductionPercent > 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin anticipar cobraría aprox.{' '}
                  <strong className="text-foreground">
                    {formatCurrencyExact(row.calculation.ordinaryMonthlyBeforeReduction)}
                  </strong>
                  /mes; con la fecha elegida la SS aplica{' '}
                  <strong className="text-foreground">−{row.reductionPercent} %</strong> →{' '}
                  <strong className="text-foreground">
                    {row.monthlyPension != null
                      ? formatCurrencyExact(row.monthlyPension)
                      : '—'}
                  </strong>
                  /mes bruto.
                </p>
              )}

            <SimulationCalculationBreakdown row={row} />

            {comparison.length > 1 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Comparativa rápida</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[720px]">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-2">Escenario</th>
                        <th className="py-2 pr-2">Fecha</th>
                        <th className="py-2 pr-2">Reducción</th>
                        <th className="py-2 pr-2">Bruto/mes</th>
                        <th className="py-2 pr-2">Neto/mes</th>
                        <th className="py-2">Neto anual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((r) => (
                        <tr key={r.label + r.retirementDateLabel} className="border-b border-border/40">
                          <td className="py-2 pr-2 font-medium">{r.label}</td>
                          <td className="py-2 pr-2 tabular-nums">{r.retirementDateLabel}</td>
                          <td className="py-2 pr-2">
                            {r.reductionPercent > 0 ? `−${r.reductionPercent} %` : '0 %'}
                          </td>
                          <td className="py-2 pr-2 tabular-nums">
                            {r.monthlyPension != null
                              ? formatCurrencyExact(r.monthlyPension)
                              : '—'}
                          </td>
                          <td className="py-2 pr-2 tabular-nums">
                            {r.netMonthly != null ? formatCurrencyExact(r.netMonthly) : '—'}
                          </td>
                          <td className="py-2 tabular-nums">
                            {r.netAnnual != null ? formatCurrencyExact(r.netAnnual) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Orientativo. El IRPF real lo fija AEAT/SS según mínimo personal, situación familiar
              y tablas de retención vigentes. No sustituye la simulación oficial de la Seguridad
              Social.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
