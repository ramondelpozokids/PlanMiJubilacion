import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { formatCurrencyExact, cn } from '@/lib/utils';
import { PrintButton } from '@/components/features/print-button';
import { CollapsibleSection } from '@/components/features/collapsible-section';

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
    <div
      className={cn(
        'rounded-lg border p-4',
        emphasize ? 'border-foreground/20 bg-muted/40' : 'bg-muted/15'
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CompareRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-2.5 last:border-0">
      <span className={cn('text-sm', muted && 'text-muted-foreground')}>{label}</span>
      <span
        className={cn(
          'shrink-0 tabular-nums text-sm font-semibold',
          muted && 'font-normal text-muted-foreground'
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function Subsidio52Card({
  outlook,
  variant = 'self',
}: {
  outlook: RetirementOutlook;
  variant?: 'self' | 'consultation';
}) {
  const pipe = outlook.erpPipeline;
  const s = pipe.projection;
  const cfg = s.config;
  const c = pipe.comparativa;
  const informe = pipe.informe;
  const pct = (cfg.subsidioPercentOfIprem * 100).toFixed(0);
  const ingresoLabel = variant === 'consultation' ? 'Lo que ingresa' : 'Lo que ingresas';
  const escenarioLabel =
    variant === 'consultation'
      ? 'Desempleo → subsidio +52 (esta persona)'
      : c.tuEscenario.label;
  const ssNote =
    variant === 'consultation'
      ? 'La simulación SS asume empleo continuo (referencia, no el escenario del cliente).'
      : 'La simulación SS asume empleo continuo (referencia, no tu caso).';

  return (
    <Card className="print-root overflow-hidden">
      <CardHeader className="space-y-3 border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {variant === 'consultation' ? 'Escenario del cliente' : 'Escenario vital'}
            </p>
            <CardTitle className="mt-1 text-xl tracking-tight">
              Subsidio mayores de 52 años
            </CardTitle>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {formatCurrencyExact(s.monthly.bruto)}/mes en 12 pagas · el SEPE no retiene IRPF ·
              cotización a la Seguridad Social incluida.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {cfg.status === 'provisional' && (
              <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                Parámetros provisionales
              </span>
            )}
            <PrintButton label="Imprimir" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label={ingresoLabel}
            value={formatCurrencyExact(s.monthly.bruto)}
            hint={`${pct}% del IPREM (${formatCurrencyExact(cfg.ipremMonthly)}) · bruto = neto en cuenta`}
            emphasize
          />
          <Metric
            label="IRPF (SEPE)"
            value="Sin retención"
            hint="Tributa en la renta al declarar; el ingreso es íntegro"
          />
          <Metric
            label="Base de cotización"
            value={formatCurrencyExact(s.monthly.baseCotizacion)}
            hint={`Anual ${formatCurrencyExact(s.annual.baseCotizacion)} · cotiza el SEPE por ti`}
            emphasize
          />
          <Metric
            label="Pensión estimada"
            value={
              outlook.pension.ordinaryResult
                ? formatCurrencyExact(outlook.pension.ordinaryResult.monthlyPension)
                : '—'
            }
            hint={`${s.untilRetirement.months} meses en subsidio +52`}
          />
        </div>

        <CollapsibleSection title="Comparativa de escenarios" defaultOpen>
          <CompareRow
            label={escenarioLabel}
            value={
              c.tuEscenario.pensionMensual != null
                ? formatCurrencyExact(c.tuEscenario.pensionMensual)
                : '—'
            }
          />
          <CompareRow
            label={c.sinCotizarMas.label}
            value={
              c.sinCotizarMas.pensionMensual != null
                ? formatCurrencyExact(c.sinCotizarMas.pensionMensual)
                : '—'
            }
          />
          <CompareRow
            label={c.simulacionSs.label}
            value={
              c.simulacionSs.pensionMensual != null
                ? formatCurrencyExact(c.simulacionSs.pensionMensual)
                : '—'
            }
            muted
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Δ frente a no cotizar más:{' '}
            {c.deltas.vsFreeze != null
              ? `${c.deltas.vsFreeze >= 0 ? '+' : ''}${formatCurrencyExact(c.deltas.vsFreeze)}/mes`
              : '—'}
            {' · '}
            {ssNote}
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="Detalle del cálculo">
          <dl className="space-y-2.5 text-sm">
            {informe.steps.map((st) => (
              <div key={st.id} className="grid gap-0.5 border-b border-border/40 pb-2 last:border-0">
                <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {st.label}
                </dt>
                <dd className="leading-snug tabular-nums">{st.value}</dd>
              </div>
            ))}
          </dl>
        </CollapsibleSection>

        <p className="print-footer">
          PlanMiJubilacion · Subsidio +52 · {new Date().toLocaleString('es-ES')}
        </p>
      </CardContent>
    </Card>
  );
}
