'use client';

import { formatCurrencyExact } from '@/lib/utils';
import type { DateSimulationRow } from '@/lib/asesoria-wizard/simulate-at-date';

/**
 * Transparencia del cálculo de anticipada (tablas BOE art. 207/208 / DT 34ª).
 */
export function SimulationCalculationBreakdown({
  row,
}: {
  row: DateSimulationRow | null;
}) {
  const c = row?.calculation;
  if (!row || !c) return null;

  const ant = c.anticipation;

  return (
    <section
      className="rounded-xl border bg-muted/20 p-5 space-y-4"
      aria-labelledby="calc-breakdown-title"
    >
      <h3 id="calc-breakdown-title" className="text-base font-semibold tracking-tight">
        ¿Cómo se ha calculado esta simulación?
      </h3>
      <dl className="grid gap-3 sm:grid-cols-2 text-sm">
        <div>
          <dt className="text-muted-foreground">Fecha ordinaria</dt>
          <dd className="font-medium">{c.ordinaryDateLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Fecha elegida</dt>
          <dd className="font-medium">{c.chosenDateLabel}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Anticipo exacto</dt>
          <dd className="font-medium">
            {ant.years} años, {ant.months} meses, {ant.days} días
            {ant.monthsEarly > 0 && (
              <span className="block text-xs text-muted-foreground font-normal">
                = {ant.monthsEarly} meses a efectos legales (mes o fracción de mes)
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Modalidad</dt>
          <dd className="font-medium">{c.modalityLabel}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Tramo de cotización</dt>
          <dd className="font-medium">
            {c.bracket.label}
            <span className="block text-xs text-muted-foreground font-normal">
              {c.completeContributionMonths} meses cotizados completos
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Coeficiente reductor</dt>
          <dd className="font-medium">
            {c.coefficient ? `${c.coefficient.reductionPercent} %` : '0 %'}
            {c.coefficient && (
              <span className="block text-xs text-muted-foreground font-normal">
                Tabla {c.coefficient.tableYear} · {c.coefficient.tableKind} · mes{' '}
                {c.coefficient.monthsEarlyUsed}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Norma aplicada</dt>
          <dd className="font-medium text-sm leading-snug">{c.legalNormSummary}</dd>
          {c.coefficient?.boeRef && (
            <dd className="text-xs text-muted-foreground mt-1">{c.coefficient.boeRef}</dd>
          )}
        </div>
        <div>
          <dt className="text-muted-foreground">Pensión antes de reducción</dt>
          <dd className="font-medium">
            {c.ordinaryMonthlyBeforeReduction != null
              ? formatCurrencyExact(c.ordinaryMonthlyBeforeReduction)
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Pensión resultante</dt>
          <dd className="font-medium">
            {c.finalMonthly != null ? formatCurrencyExact(c.finalMonthly) : '—'}
          </dd>
        </div>
      </dl>
      {c.notes.length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          {c.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
