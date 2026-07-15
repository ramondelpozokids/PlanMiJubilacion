import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { formatCurrency } from '@/lib/utils';

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative pl-8 pb-6 last:pb-0">
      <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-xs font-semibold">
        {n}
      </div>
      {n < 6 && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" aria-hidden />
      )}
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function Subsidio52Card({ outlook }: { outlook: RetirementOutlook }) {
  const pipe = outlook.erpPipeline;
  const s = pipe.projection;
  const cfg = s.config;
  const c = pipe.comparativa;
  const informe = pipe.informe;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pipeline subsidio +52</CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          IPREM × {(cfg.subsidioPercentOfIprem * 100).toFixed(0)}% → neto → base → impacto →
          comparativa → informe. Params {pipe.paramsFingerprint}
          {cfg.status === 'provisional' && (
            <span className="text-warning"> · año provisional (herencia JSON)</span>
          )}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <Step n={1} title="Subsidio bruto = IPREM × 95%">
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(s.monthly.bruto)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(cfg.ipremMonthly)} × {cfg.subsidioPercentOfIprem} ·{' '}
                {informe.formulaBruto}
              </p>
            </Step>

            <Step n={2} title="Subsidio neto">
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(s.monthly.neto)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                IRPF {(cfg.irpfRetentionRate * 100).toFixed(0)}% ·{' '}
                {formatCurrency(s.monthly.irpf)} retención
              </p>
            </Step>

            <Step n={3} title="Base cotización">
              <p className="text-xl font-semibold tabular-nums">
                {formatCurrency(s.monthly.baseCotizacion)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JSON baseMinima · coef. legal ×{cfg.cotizacionPercentOfMinima} · anual{' '}
                {formatCurrency(s.annual.baseCotizacion)}
              </p>
            </Step>

            <Step n={4} title="Impacto jubilación">
              <p className="text-xl font-semibold tabular-nums">
                {outlook.pension.ordinaryResult
                  ? formatCurrency(outlook.pension.ordinaryResult.monthlyPension)
                  : '—'}
                <span className="text-sm font-normal text-muted-foreground"> /mes pensión</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {s.untilRetirement.months} meses +52 · total cobrado{' '}
                {formatCurrency(s.untilRetirement.totalBruto)} · bases acumuladas{' '}
                {formatCurrency(s.untilRetirement.totalBaseCotizacion)}
              </p>
            </Step>

            <Step n={5} title="Comparativa">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <span>{c.tuEscenario.label}</span>
                  <span className="font-medium tabular-nums">
                    {c.tuEscenario.pensionMensual != null
                      ? formatCurrency(c.tuEscenario.pensionMensual)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <span>{c.sinCotizarMas.label}</span>
                  <span className="tabular-nums">
                    {c.sinCotizarMas.pensionMensual != null
                      ? formatCurrency(c.sinCotizarMas.pensionMensual)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <span>{c.simulacionSs.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c.simulacionSs.pensionMensual != null
                      ? formatCurrency(c.simulacionSs.pensionMensual)
                      : '—'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Δ freeze{' '}
                  {c.deltas.vsFreeze != null
                    ? `${c.deltas.vsFreeze >= 0 ? '+' : ''}${formatCurrency(c.deltas.vsFreeze)}`
                    : '—'}
                  {' · '}Δ sim SS{' '}
                  {c.deltas.vsSimSs != null
                    ? `${c.deltas.vsSimSs >= 0 ? '+' : ''}${formatCurrency(c.deltas.vsSimSs)}`
                    : '—'}
                </p>
              </div>
            </Step>

            <Step n={6} title="Informe">
              <ul className="text-sm space-y-1">
                {informe.steps.map((st) => (
                  <li key={st.id}>
                    <span className="text-muted-foreground">{st.label}:</span> {st.value}
                  </li>
                ))}
              </ul>
            </Step>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-4 space-y-2">
              <p className="text-sm font-medium">2028 · Cambian bases</p>
              <p className="text-sm text-muted-foreground">
                Editas <code className="text-xs">lib/rules/subsidio-52-params.json</code> →
                el ERP recalcula bruto, neto, base, pensión, escenarios e informe en el
                siguiente outlook / recalculate.
              </p>
              <pre className="text-xs overflow-x-auto rounded border bg-background p-3 mt-2">{`{
  "2028": {
    "iprem": 610,
    "smi": 1381,
    "baseMinima": 1780.62,
    "subsidio52": 0.95,
    "cotizacion52": 1.25,
    "irpfDefecto": 0
  }
}`}</pre>
              <p className="text-xs text-muted-foreground">
                Ahora 2027/2028 están vacíos → heredan 2026. Años en JSON:{' '}
                {informe.yearsInParams.join(', ')}.
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>{cfg.notes}</p>
              <ul className="list-disc pl-4">
                {cfg.sources.map((src) => (
                  <li key={src}>{src}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
