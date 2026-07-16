'use client';

import type { ReactNode } from 'react';
import { useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import {
  previewFreeStrategyAction,
  runDenseSweepAction,
} from '@/app/(app)/miop/actions';
import type { MiopPath } from '@/lib/optimization/types';

type Preview = Awaited<ReturnType<typeof previewFreeStrategyAction>>;
type Sweep = Awaited<ReturnType<typeof runDenseSweepAction>>;

const PATHS: { value: MiopPath; label: string }[] = [
  { value: 'subsidio52', label: 'Subsidio mayores 52' },
  { value: 'subsidio52_convenio', label: 'Subsidio + convenio especial' },
  { value: 'freeze', label: 'Sin cotizar más (freeze)' },
];

export function MiopFreeSimulator({
  defaultRetirementDate,
  defaultBase,
  defaultSubsidioFrom,
}: {
  defaultRetirementDate: string;
  defaultBase: number;
  defaultSubsidioFrom: string;
}) {
  const [pending, start] = useTransition();
  const [sweepPending, startSweep] = useTransition();
  const [path, setPath] = useState<MiopPath>('subsidio52');
  const [retirementDate, setRetirementDate] = useState(defaultRetirementDate);
  const [futureBase, setFutureBase] = useState(String(Math.round(defaultBase)));
  const [convenioMonths, setConvenioMonths] = useState('24');
  const [convenioBase, setConvenioBase] = useState(String(Math.round(defaultBase)));
  const [irpf, setIrpf] = useState('0');
  const [expectancy, setExpectancy] = useState('20');
  const [subsidioFrom, setSubsidioFrom] = useState(defaultSubsidioFrom);
  const [inflation, setInflation] = useState('0');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sweep, setSweep] = useState<Sweep | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      start(async () => {
        setError(null);
        try {
          const r = await previewFreeStrategyAction({
            path,
            retirementDate,
            futureMonthlyBase: Number(futureBase) || null,
            convenioMonths: path === 'subsidio52_convenio' ? Number(convenioMonths) || 0 : 0,
            convenioBase: path === 'subsidio52_convenio' ? Number(convenioBase) || null : null,
            irpfRetention: Number(irpf) / 100,
            expectancyYearsFrom65: Number(expectancy) || null,
            subsidioMayores52From: subsidioFrom || null,
            inflationAnnual: Number(inflation) / 100,
          });
          setPreview(r);
        } catch (e) {
          setPreview(null);
          setError(e instanceof Error ? e.message : 'Error al calcular');
        }
      });
    }, 280);
    return () => clearTimeout(t);
  }, [
    path,
    retirementDate,
    futureBase,
    convenioMonths,
    convenioBase,
    irpf,
    expectancy,
    subsidioFrom,
    inflation,
  ]);

  function runSweep() {
    startSweep(async () => {
      setError(null);
      try {
        const r = await runDenseSweepAction();
        setSweep(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error en barrido');
      }
    });
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Simulador libre</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Misma función <code className="text-xs">evaluateScenario</code> que el motor. Cambia
            cualquier variable; recalcula en tiempo real.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Vía</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={path}
              onChange={(e) => setPath(e.target.value as MiopPath)}
            >
              {PATHS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Fecha jubilación">
              <Input
                type="date"
                value={retirementDate}
                onChange={(e) => setRetirementDate(e.target.value)}
              />
            </Field>
            <Field label="Inicio subsidio +52 (YYYY-MM)">
              <Input value={subsidioFrom} onChange={(e) => setSubsidioFrom(e.target.value)} />
            </Field>
            <Field label="Base cotización futura (€)">
              <Input
                type="number"
                min={0}
                value={futureBase}
                onChange={(e) => setFutureBase(e.target.value)}
              />
            </Field>
            <Field label="IRPF retención (%)">
              <Input type="number" min={0} max={50} step={0.5} value={irpf} onChange={(e) => setIrpf(e.target.value)} />
            </Field>
            <Field label="Esperanza vida desde 65 (años)">
              <Input
                type="number"
                min={5}
                max={40}
                value={expectancy}
                onChange={(e) => setExpectancy(e.target.value)}
              />
            </Field>
            <Field label="Inflación anual (%)">
              <Input
                type="number"
                min={0}
                max={15}
                step={0.1}
                value={inflation}
                onChange={(e) => setInflation(e.target.value)}
              />
            </Field>
          </div>

          {path === 'subsidio52_convenio' && (
            <div className="grid sm:grid-cols-2 gap-3 border-t pt-4">
              <Field label="Meses convenio">
                <Input
                  type="number"
                  min={0}
                  value={convenioMonths}
                  onChange={(e) => setConvenioMonths(e.target.value)}
                />
              </Field>
              <Field label="Base convenio (€)">
                <Input
                  type="number"
                  min={0}
                  value={convenioBase}
                  onChange={(e) => setConvenioBase(e.target.value)}
                />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-warning">{error}</p>}
          {pending && !preview && (
            <p className="text-sm text-muted-foreground">Calculando…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Edad" value={`${preview.retirementAge} años`} />
              <Stat
                label="Reducción"
                value={preview.reductionPercent > 0 ? `−${preview.reductionPercent}%` : '0%'}
              />
              <Stat
                label="Pensión bruta"
                value={
                  preview.pensionMensual != null ? formatCurrency(preview.pensionMensual) : '—'
                }
              />
              <Stat
                label="Pensión neta"
                value={preview.pensionNeto != null ? formatCurrency(preview.pensionNeto) : '—'}
              />
              <Stat
                label="BR"
                value={
                  preview.baseReguladora != null ? formatCurrency(preview.baseReguladora) : '—'
                }
              />
              <Stat
                label="% por años"
                value={preview.porcentaje != null ? `${preview.porcentaje.toFixed(1)}%` : '—'}
              />
              <Stat label="Coste convenio" value={formatCurrency(preview.convenioCost)} />
              <Stat
                label="Beneficio vida"
                value={
                  preview.lifetimeBenefit != null
                    ? formatCurrency(preview.lifetimeBenefit)
                    : '—'
                }
              />
              <p className="col-span-2 text-xs text-muted-foreground">{preview.notes}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Ajusta variables a la izquierda.</p>
          )}

          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Barrido masivo (M4)</p>
            <p className="text-xs text-muted-foreground">
              Genera y evalúa miles de combinaciones en chunks async (mismo motor de cálculo).
            </p>
            <Button onClick={runSweep} disabled={sweepPending} className="w-full">
              {sweepPending ? 'Barrido en curso…' : 'Lanzar barrido denso'}
            </Button>
            {sweep && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  {sweep.strategiesEvaluated}/{sweep.strategiesGenerated} evaluadas ·{' '}
                  {(sweep.elapsedMs / 1000).toFixed(1)} s
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-foreground">
                  {sweep.podium.map((p) => (
                    <li key={p.rank}>
                      <span className="font-medium">{p.score}/100</span> · {p.name}
                      {p.pensionMensual != null
                        ? ` · ${formatCurrency(p.pensionMensual)}/mes`
                        : ''}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums mt-1">{value}</p>
    </div>
  );
}
