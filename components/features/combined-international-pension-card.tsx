import { formatCurrencyExact } from '@/lib/utils';
import type { CombinedPensionSummary } from '@/lib/international-coordination/combined';

export function CombinedInternationalPensionCard({
  summary,
  clientName,
}: {
  summary: CombinedPensionSummary;
  clientName?: string;
}) {
  const who = clientName ?? 'Usted';

  return (
    <section className="rounded-xl border p-5 space-y-4 break-inside-avoid">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Pensiones multi-país
        </p>
        <h2 className="text-lg font-semibold">España + extranjero (suma orientativa)</h2>
        <p className="mt-1 text-sm text-muted-foreground">{summary.explanation}</p>
      </div>

      <ul className="divide-y rounded-lg border text-sm">
        {summary.lines.map((line) => (
          <li key={`${line.countryCode}-${line.label}`} className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <div>
              <p className="font-medium">{line.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{line.note}</p>
            </div>
            <p className="tabular-nums font-semibold shrink-0">
              {line.monthlyEur != null ? `${formatCurrencyExact(line.monthlyEur)}/mes` : '—'}
            </p>
          </li>
        ))}
      </ul>

      {summary.combinedMonthly != null && (
        <div className="rounded-lg bg-foreground text-background px-4 py-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide opacity-80">
              Total orientativo que {who.toLowerCase()} puede percibir
            </p>
            <p className="text-sm opacity-90 mt-1">
              España {summary.spainMonthly != null ? formatCurrencyExact(summary.spainMonthly) : '—'}{' '}
              + extranjero documentado {formatCurrencyExact(summary.foreignDocumentedTotal)}
            </p>
          </div>
          <p className="text-3xl font-semibold tabular-nums">
            {formatCurrencyExact(summary.combinedMonthly)}
            <span className="text-base font-normal opacity-80">/mes</span>
          </p>
        </div>
      )}

      {summary.hasUndocumentedForeign && (
        <p className="text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
          Falta el importe de algún país. Cuando llegue la carta (p. ej. de Alemania), introdúzcalo
          en el asistente internacional o súbalo como documento «Pensión extranjera».
        </p>
      )}

      <p className="text-xs text-muted-foreground">{summary.legalNote}</p>
    </section>
  );
}
