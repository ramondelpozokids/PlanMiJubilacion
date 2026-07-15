'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createCustomScenarioAction,
  deleteScenarioAction,
  regenerateSystemScenariosAction,
} from '@/app/(app)/comparator/actions';
import { formatCurrency } from '@/lib/utils';

export type ScenarioRow = {
  id: string;
  name: string;
  scenario_type: string;
  retirement_age: number;
  monthly_pension: number;
  total_lifetime: number;
  is_recommended: boolean;
  metadata: {
    origin?: string;
    notes?: string;
    quality?: string;
    monthsEarly?: number;
    reductionPercent?: number;
    retirementDate?: string;
    percentageByYears?: number;
    baseReguladora?: number;
  } | null;
};

export function ScenarioSimulator({
  scenarios,
  defaultBase,
  defaultRetirementDate,
}: {
  scenarios: ScenarioRow[];
  defaultBase: number;
  defaultRetirementDate: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState('Mi plan');
  const [retirementDate, setRetirementDate] = useState(defaultRetirementDate);
  const [base, setBase] = useState(String(Math.round(defaultBase)));
  const [convenioMonths, setConvenioMonths] = useState('0');
  const [convenioCost, setConvenioCost] = useState('0');
  const [paroMonths, setParoMonths] = useState('0');

  const onCreate = () => {
    start(async () => {
      try {
        const result = await createCustomScenarioAction({
          name,
          retirementDate,
          futureMonthlyBase: Number(base) || undefined,
          convenioMonths: Number(convenioMonths) || 0,
          convenioMonthlyCost: Number(convenioCost) || 0,
          paroMonths: Number(paroMonths) || 0,
        });
        toast.success(
          `Escenario guardado: ${formatCurrency(result.monthlyPension)}/mes` +
            (result.reductionPercent > 0 ? ` (−${result.reductionPercent}%)` : '')
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al simular');
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crear escenario</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Cambia fecha, base futura, convenio o paro. Se calcula sobre tu expediente (no sobre el
            PDF).
          </p>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="sc-name">Nombre</Label>
            <Input id="sc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-date">Fecha jubilación</Label>
            <Input
              id="sc-date"
              type="date"
              value={retirementDate}
              onChange={(e) => setRetirementDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-base">Base mensual futura (€)</Label>
            <Input
              id="sc-base"
              type="number"
              min={0}
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-paro">Meses de paro (asimilados)</Label>
            <Input
              id="sc-paro"
              type="number"
              min={0}
              value={paroMonths}
              onChange={(e) => setParoMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-conv-m">Meses convenio especial</Label>
            <Input
              id="sc-conv-m"
              type="number"
              min={0}
              value={convenioMonths}
              onChange={(e) => setConvenioMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-conv-c">Coste mensual convenio (€)</Label>
            <Input
              id="sc-conv-c"
              type="number"
              min={0}
              value={convenioCost}
              onChange={(e) => setConvenioCost(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2">
            <Button onClick={onCreate} disabled={pending}>
              {pending ? 'Calculando…' : 'Calcular y guardar'}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  try {
                    await regenerateSystemScenariosAction();
                    toast.success('Escenarios base regenerados');
                    router.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Error');
                  }
                })
              }
            >
              Regenerar escenarios base
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comparativa ({scenarios.length} escenario{scenarios.length === 1 ? '' : 's'})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {scenarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay escenarios. Sube documentos o pulsa “Regenerar escenarios base”.
            </p>
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Escenario</th>
                  <th className="py-2 pr-2">Origen</th>
                  <th className="py-2 pr-2">Edad</th>
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Reducción</th>
                  <th className="py-2 pr-2">Pensión/mes</th>
                  <th className="py-2 pr-2">Calidad</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const meta = s.metadata ?? {};
                  const origin = meta.origin === 'custom' ? 'Tuyo' : 'Sistema';
                  const date = meta.retirementDate
                    ? new Date(meta.retirementDate).toLocaleDateString('es-ES')
                    : '—';
                  return (
                    <tr key={s.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">
                        {s.name}
                        {s.is_recommended ? (
                          <span className="ml-2 text-xs text-accent">recomendada</span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground">{origin}</td>
                      <td className="py-2 pr-2">{Number(s.retirement_age).toFixed(0)}</td>
                      <td className="py-2 pr-2">{date}</td>
                      <td className="py-2 pr-2 text-warning">
                        {meta.reductionPercent != null && meta.reductionPercent > 0
                          ? `−${meta.reductionPercent}%`
                          : '0%'}
                      </td>
                      <td className="py-2 pr-2 font-semibold">
                        {formatCurrency(Number(s.monthly_pension))}
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {meta.quality === 'full'
                          ? 'Documentado'
                          : meta.quality === 'partial'
                            ? 'Estimación'
                            : '—'}
                      </td>
                      <td className="py-2 text-right">
                        {meta.origin === 'custom' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() =>
                              start(async () => {
                                try {
                                  await deleteScenarioAction(s.id);
                                  toast.success('Eliminado');
                                  router.refresh();
                                } catch (e) {
                                  toast.error(e instanceof Error ? e.message : 'Error');
                                }
                              })
                            }
                          >
                            Eliminar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Cálculo orientativo (reglas SS). Las cifras con calidad “Estimación” usan bases
            incompletas o proyectadas — no sustituyen la resolución del INSS.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
