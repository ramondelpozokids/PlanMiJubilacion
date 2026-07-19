'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { describeLifePathTramos } from '@/lib/calculator/life-path';
import {
  DEFAULT_IRPF_RETENTION,
  IRPF_RETENTION_PRESETS,
  applyPensionIrpf,
  pensionPaymentsLabel,
} from '@/lib/calculator/pension-pay';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function RetirementOutlookCard({
  outlook,
  variant = 'self',
  clientName,
}: {
  outlook: RetirementOutlook;
  variant?: 'self' | 'consultation';
  clientName?: string;
}) {
  const [irpfRetention, setIrpfRetention] = useState(DEFAULT_IRPF_RETENTION);
  const p = outlook.pension.ordinaryResult;
  const pay = p ? applyPensionIrpf(p.monthlyPension, irpfRetention) : null;
  const sim = outlook.pension.officialSimReference;
  const path = outlook.pension.lifePath;
  const tramos = describeLifePathTramos(path);
  const who = variant === 'consultation' ? clientName ?? 'Esta persona' : 'Tú';
  const possessive = variant === 'consultation' ? 'su' : 'tu';
  const irpfPctLabel = `${(irpfRetention * 100).toFixed(0)} %`;

  return (
    <Card className="border-2 border-foreground/15">
      <CardHeader>
        <CardTitle className="text-lg">
          {variant === 'consultation'
            ? `Cuándo y cómo puede jubilarse ${clientName ?? ''}`.trim()
            : 'Cuándo y cómo puedes jubilarte'}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-normal">
          Cálculo con reglas SS {new Date().getFullYear()} · {outlook.ageTodayLabel} hoy ·{' '}
          {outlook.carreraLabel} cotizados
          {outlook.asOf
            ? ` · informe ${format(new Date(outlook.asOf), 'dd/MM/yyyy')}`
            : ''}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Jubilación ordinaria
            </p>
            <p className="text-2xl font-semibold mt-1">{outlook.ordinary.dateLabel}</p>
            <p className="text-sm text-muted-foreground mt-1">
              A los {outlook.ordinary.ageLabel}
              {outlook.ordinary.at65IfCareer
                ? outlook.ordinary.careerCompleteDateLabel
                  ? ` · ${variant === 'consultation' ? 'faltan' : 'te faltan'} ${outlook.ordinary.missingForAge65Label} (carrera completa el ${outlook.ordinary.careerCompleteDateLabel})`
                  : ' · carrera completa en esa fecha'
                : ` · ${variant === 'consultation' ? 'faltan' : 'te faltan'} ${outlook.ordinary.missingForAge65Label || `${outlook.ordinary.monthsMissingForAge65} meses`} para poder a los 65`}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{outlook.ordinary.explanation}</p>
            {outlook.ordinaryIfFreeze && (
              <p className="text-xs text-warning mt-2">
                Si dejas de cotizar del todo: {outlook.ordinaryIfFreeze.dateLabel} (
                {outlook.ordinaryIfFreeze.ageLabel})
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Anticipada voluntaria (desde {outlook.earlyVoluntary.minAge})
            </p>
            {outlook.earlyVoluntary.monthsMissingFor35 > 0 ? (
              <>
                <p className="text-2xl font-semibold mt-1">Aún no</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Faltan {outlook.earlyVoluntary.monthsMissingFor35} meses para los 35 años
                  exigidos. Primera ventana estimada:{' '}
                  {outlook.earlyVoluntary.earliestEligibleLabel ?? '—'}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-semibold mt-1">
                  {outlook.earlyVoluntary.earliestEligibleLabel}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Primera fecha posible con {outlook.earlyVoluntary.minYearsRequired}+ años
                  cotizados
                </p>
              </>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Pensión ({possessive} escenario)
            </p>
            {p && pay ? (
              <>
                <p className="text-2xl font-semibold mt-1">
                  {formatCurrency(pay.monthlyBruto)}
                  <span className="text-sm font-normal text-muted-foreground"> /mes bruto</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(pay.annualBruto)} /año · {pensionPaymentsLabel()}
                </p>
                <p className="text-sm font-medium mt-2">
                  {formatCurrency(pay.netMonthly)}
                  <span className="font-normal text-muted-foreground">
                    {' '}
                    /mes neto · {formatCurrency(pay.netAnnual)} /año neto
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  IRPF {irpfPctLabel} orientativo (−{formatCurrency(pay.irpfMonthly)}/mes)
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {outlook.pension.quality === 'bases_plus_path'
                    ? `Informe de bases + subsidio +52 desde ${path.subsidioMayores52From}`
                    : `${p.percentageByYears.toFixed(1)}% · BR ${formatCurrency(p.baseReguladora)}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  BR {formatCurrency(p.baseReguladora)} · base futura oficial{' '}
                  {formatCurrency(outlook.subsidio52.monthly.baseCotizacion)}/mes
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">
                Sin importe fiable aún. Relee el Informe Integral de Bases de Cotización.
              </p>
            )}
            <p
              className={`text-xs mt-2 ${
                outlook.pension.quality === 'none' ? 'text-warning' : 'text-muted-foreground'
              }`}
            >
              {outlook.pension.methodNote}
            </p>
          </div>
        </div>

        {p && (
          <div className="rounded-md border bg-muted/20 p-3 space-y-2">
            <p className="text-sm font-medium">IRPF retención (orientativo)</p>
            <div className="flex flex-wrap gap-1">
              {IRPF_RETENTION_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={Math.abs(irpfRetention - preset.value) < 0.001 ? 'primary' : 'secondary'}
                  onClick={() => setIrpfRetention(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              La retención real la fija AEAT/SS según situación personal. Aquí solo estimamos qué
              queda neto tras descontar IRPF.
            </p>
          </div>
        )}

        {outlook.ordinary.ssSteps.length > 0 && (
          <div className="rounded-md border bg-muted/20 p-4 text-sm space-y-3">
            <p className="font-medium">Cómo calcula la Seguridad Social (4 pasos)</p>
            <ol className="space-y-2.5">
              {outlook.ordinary.ssSteps.map((step) => (
                <li key={step.title}>
                  <p className="font-medium text-foreground">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                </li>
              ))}
            </ol>
            {outlook.ordinary.at65IfCareer && (
              <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                Conclusión: si {variant === 'consultation' ? 'continúa' : 'continúas'} cotizando con
                normalidad, la SS reconoce la ordinaria el {outlook.ordinary.dateLabel} sin
                penalización por edad.
              </p>
            )}
          </div>
        )}

        {(tramos.paro || tramos.subsidio) && (
          <div className="rounded-md border bg-muted/20 p-3 text-sm space-y-1">
            <p className="font-medium">Cotización hasta la jubilación ({possessive} escenario)</p>
            {tramos.paro && <p className="text-muted-foreground">1. {tramos.paro}</p>}
            {tramos.subsidio && (
              <p className="text-muted-foreground">
                2. {tramos.subsidio} ({formatCurrency(outlook.subsidio52.monthly.baseCotizacion)}
                /mes en {new Date().getFullYear()}+)
              </p>
            )}
            <p className="text-xs text-muted-foreground pt-1">
              Objetivo: ordinaria el {outlook.ordinary.dateLabel} (carrera completa cotizando).
            </p>
          </div>
        )}

        {sim && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">Referencia SS (no es {possessive} escenario real)</p>
            <p className="text-muted-foreground mt-1">
              Simulación oficial {formatCurrency(sim.pensionMensual)}/mes bruto
              {sim.fechaJubilacion ? ` · ${sim.fechaJubilacion}` : ''} — hipótesis de empleo
              continuo.
              {path.subsidioMayores52From.startsWith('2099')
                ? ` ${who} no tiene activado subsidio +52 en el escenario.`
                : ` Desde ${path.subsidioMayores52From} se ha modelado subsidio mayores de 52.`}
            </p>
          </div>
        )}

        {outlook.earlyVoluntary.scenarios.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">
              Si se jubila antes: % que le quitan (coeficientes reductores)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Momento</th>
                    <th className="py-2 pr-2">Fecha</th>
                    <th className="py-2 pr-2">Meses antes</th>
                    <th className="py-2 pr-2">Reducción (BOE)</th>
                    <th className="py-2 pr-2">Bruto/mes</th>
                    <th className="py-2">Neto/mes ({irpfPctLabel})</th>
                  </tr>
                </thead>
                <tbody>
                  {outlook.earlyVoluntary.scenarios.map((s) => {
                    const earlyPay =
                      s.estimatedMonthly != null
                        ? applyPensionIrpf(s.estimatedMonthly, irpfRetention)
                        : null;
                    return (
                      <tr key={s.label} className="border-b border-border/40">
                        <td className="py-2 pr-2 font-medium">{s.label}</td>
                        <td className="py-2 pr-2">
                          {format(s.retirementDate, 'dd/MM/yyyy', { locale: es })}
                        </td>
                        <td className="py-2 pr-2">{s.monthsEarly}</td>
                        <td className="py-2 pr-2 text-warning font-medium">
                          −{s.reductionPercent}%
                          {s.careerBracketLabel && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {s.careerBracketLabel}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-2">
                          {earlyPay ? formatCurrency(earlyPay.monthlyBruto) : '—'}
                        </td>
                        <td className="py-2">
                          {earlyPay ? formatCurrency(earlyPay.netMonthly) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">{outlook.disclaimer}</p>
      </CardContent>
    </Card>
  );
}
