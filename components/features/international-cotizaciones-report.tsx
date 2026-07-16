import type { InternationalCoordinationResult } from '@/lib/international-coordination/types';
import { CollapsibleSection } from '@/components/features/collapsible-section';

export function InternationalCotizacionesReport({
  result,
}: {
  result: InternationalCoordinationResult;
}) {
  return (
    <section className="rounded-xl border p-5 space-y-4 break-inside-avoid">
      <div>
        <h2 className="text-lg font-semibold">Cotizaciones internacionales</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Coordinación y totalización. Si aporta la carta oficial extranjera, el importe se muestra
          y se puede sumar a la estimación española.
        </p>
      </div>

      {result.spanishEstimateMayBeIncomplete && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          La estimación de pensión española puede ser <strong>incompleta</strong> como visión global
          si hay cotizaciones en el extranjero. Cada país paga su parte.
        </div>
      )}

      <CollapsibleSection title="Países y periodos" defaultOpen>
        <ul className="space-y-3 text-sm">
          {result.evaluations.map((ev) => (
            <li key={ev.period.id} className="rounded-lg border p-3">
              <p className="font-medium">{ev.country.name}</p>
              <dl className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="inline">Años cotizados: </dt>
                  <dd className="inline text-foreground">
                    {ev.period.yearsContributed ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Periodo: </dt>
                  <dd className="inline text-foreground">
                    {ev.period.approximateStart ?? '?'} → {ev.period.approximateEnd ?? '?'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Totalización: </dt>
                  <dd className="inline text-foreground">
                    {ev.totalizationPossible ? 'Posible' : 'No / incierto'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Convenio: </dt>
                  <dd className="inline text-foreground">{ev.legalBasis}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="inline">Pensión documentada: </dt>
                  <dd className="inline text-foreground font-medium">
                    {ev.documentedMonthlyEur != null
                      ? `${ev.documentedMonthlyEur.toFixed(2)} €/mes`
                      : 'Pendiente de carta oficial'}
                    {ev.period.documentedPensionSource
                      ? ` · ${ev.period.documentedPensionSource}`
                      : ''}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {result.multiplePensionsLikely && (
        <p className="text-sm">
          <strong>Posible derecho a varias pensiones</strong> — una por cada país con coordinación
          aplicable.
        </p>
      )}

      <CollapsibleSection title="Recomendaciones" defaultOpen>
        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
          {result.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </CollapsibleSection>

      <CollapsibleSection title="Advertencias legales">
        <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
          {result.globalWarnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </CollapsibleSection>
    </section>
  );
}
