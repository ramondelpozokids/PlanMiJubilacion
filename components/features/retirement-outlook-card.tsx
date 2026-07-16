import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
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
  const p = outlook.pension.ordinaryResult;
  const sim = outlook.pension.officialSimReference;
  const path = outlook.pension.lifePath;
  const who = variant === 'consultation' ? clientName ?? 'Esta persona' : 'Tú';
  const possessive = variant === 'consultation' ? 'su' : 'tu';

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
          {outlook.carrera.years} años y {outlook.carrera.months} meses cotizados
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
                ? ' · carrera completa en esa fecha (cotizando con subsidio +52)'
                : ` · te faltan ${outlook.ordinary.monthsMissingForAge65} meses cotizados para poder a los 65`}
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
            {p ? (
              <>
                <p className="text-2xl font-semibold mt-1">{formatCurrency(p.monthlyPension)}</p>
                <p className="text-sm text-muted-foreground mt-1">
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

        {sim && (
          <div className="rounded-md border border-dashed p-3 text-sm">
            <p className="font-medium">Referencia SS (no es {possessive} escenario real)</p>
            <p className="text-muted-foreground mt-1">
              Simulación oficial {formatCurrency(sim.pensionMensual)}/mes
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
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Momento</th>
                    <th className="py-2 pr-2">Fecha</th>
                    <th className="py-2 pr-2">Meses antes</th>
                    <th className="py-2 pr-2">Trimestres</th>
                    <th className="py-2 pr-2">Reducción</th>
                    <th className="py-2">Pensión est.</th>
                  </tr>
                </thead>
                <tbody>
                  {outlook.earlyVoluntary.scenarios.map((s) => (
                    <tr key={s.label} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{s.label}</td>
                      <td className="py-2 pr-2">
                        {format(s.retirementDate, 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="py-2 pr-2">{s.monthsEarly}</td>
                      <td className="py-2 pr-2">{s.quartersEarly}</td>
                      <td className="py-2 pr-2 text-warning font-medium">
                        −{s.reductionPercent}%
                        <span className="block text-xs font-normal text-muted-foreground">
                          ({s.coefficientPerQuarterPercent}% por trimestre)
                        </span>
                      </td>
                      <td className="py-2">
                        {s.estimatedMonthly != null
                          ? formatCurrency(s.estimatedMonthly)
                          : '—'}
                      </td>
                    </tr>
                  ))}
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
