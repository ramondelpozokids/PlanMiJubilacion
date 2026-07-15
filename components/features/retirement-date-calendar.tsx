'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { previewRetirementDateAction } from '@/app/(app)/comparator/preview-action';
import {
  createCustomScenarioAction,
  deleteScenarioAction,
} from '@/app/(app)/comparator/actions';
import { formatCurrency, cn } from '@/lib/utils';
import type { ScenarioRow } from '@/components/features/scenario-simulator';

type Preview = Awaited<ReturnType<typeof previewRetirementDateAction>>;

function toInputDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function RetirementDateCalendar({
  defaultDate,
  ordinaryDate,
  earliestDate,
  age65Date,
  minDate,
  maxDate,
  defaultBase,
  scenarios,
}: {
  defaultDate: string;
  ordinaryDate: string;
  earliestDate: string | null;
  age65Date: string;
  minDate: string;
  maxDate: string;
  defaultBase: number;
  scenarios: ScenarioRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState(defaultDate);
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date(defaultDate)));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [base, setBase] = useState(String(Math.round(defaultBase)));
  const [loadingPreview, setLoadingPreview] = useState(false);

  const ordinary = useMemo(() => new Date(ordinaryDate + 'T12:00:00'), [ordinaryDate]);
  const earliest = useMemo(
    () => (earliestDate ? new Date(earliestDate + 'T12:00:00') : null),
    [earliestDate]
  );
  const age65 = useMemo(() => new Date(age65Date + 'T12:00:00'), [age65Date]);
  const min = useMemo(() => new Date(minDate + 'T12:00:00'), [minDate]);
  const max = useMemo(() => new Date(maxDate + 'T12:00:00'), [maxDate]);
  const selectedDate = useMemo(() => new Date(selected + 'T12:00:00'), [selected]);

  const weeks = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const rows: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  }, [viewMonth]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPreview(true);
    const t = setTimeout(() => {
      previewRetirementDateAction(selected, Number(base) || undefined)
        .then((p) => {
          if (!cancelled) setPreview(p);
        })
        .catch((e) => {
          if (!cancelled) {
            setPreview(null);
            toast.error(e instanceof Error ? e.message : 'No se pudo calcular');
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingPreview(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [selected, base]);

  const pick = (day: Date) => {
    if (isBefore(day, min) || day > max) return;
    setSelected(toInputDate(day));
  };

  const jump = (iso: string) => {
    setSelected(iso);
    setViewMonth(startOfMonth(new Date(iso + 'T12:00:00')));
  };

  const save = () => {
    start(async () => {
      try {
        const result = await createCustomScenarioAction({
          name: `Jubilación ${format(selectedDate, 'dd/MM/yyyy')}`,
          retirementDate: selected,
          futureMonthlyBase: Number(base) || undefined,
        });
        toast.success(
          `Guardado: ${formatCurrency(result.monthlyPension)}/mes` +
            (result.reductionPercent > 0 ? ` (−${result.reductionPercent}%)` : '')
        );
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al guardar');
      }
    });
  };

  const savedOnly = scenarios.filter((s) => s.metadata?.origin === 'custom');

  return (
    <div className="space-y-6">
      <Card className="border-2 border-foreground/15">
        <CardHeader>
          <CardTitle className="text-lg">¿Cuándo te quieres jubilar?</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Elige el día en el calendario (como en el simulador de la Seguridad Social). El cálculo
            se actualiza al instante.
          </p>
        </CardHeader>
        <CardContent className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {earliest && (
                <Button type="button" size="sm" variant="secondary" onClick={() => jump(earliestDate!)}>
                  Primera posible
                </Button>
              )}
              <Button type="button" size="sm" variant="secondary" onClick={() => jump(age65Date)}>
                Cumplir 65
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => jump(ordinaryDate)}>
                Edad ordinaria
              </Button>
            </div>

            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between mb-3">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setViewMonth((m) => addMonths(m, -1))}
                >
                  ←
                </Button>
                <p className="text-sm font-medium capitalize">
                  {format(viewMonth, 'MMMM yyyy', { locale: es })}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setViewMonth((m) => addMonths(m, 1))}
                >
                  →
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {weeks.flat().map((day) => {
                  const inMonth = isSameMonth(day, viewMonth);
                  const disabled = isBefore(day, min) || day > max;
                  const isSelected = isSameDay(day, selectedDate);
                  const isOrdinary = isSameDay(day, ordinary);
                  const is65 = isSameDay(day, age65);
                  const isEarliest = earliest ? isSameDay(day, earliest) : false;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      onClick={() => pick(day)}
                      className={cn(
                        'relative h-10 rounded-md text-sm transition-colors',
                        !inMonth && 'text-muted-foreground/40',
                        disabled && 'opacity-30 cursor-not-allowed',
                        !disabled && !isSelected && 'hover:bg-muted',
                        isSelected && 'bg-primary text-primary-foreground font-semibold',
                        !isSelected && isOrdinary && 'ring-2 ring-accent',
                        !isSelected && is65 && !isOrdinary && 'ring-2 ring-foreground/30'
                      )}
                      title={format(day, "d 'de' MMMM yyyy", { locale: es })}
                    >
                      {format(day, 'd')}
                      {(isOrdinary || is65 || isEarliest) && !isSelected && (
                        <span
                          className={cn(
                            'absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full',
                            isOrdinary ? 'bg-accent' : isEarliest ? 'bg-warning' : 'bg-foreground/50'
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent" /> Ordinaria
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-foreground/50" /> Cumple 65
                </span>
                {earliest && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning" /> Primera posible
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-1.5">
                <Label htmlFor="cal-date">O escribe la fecha</Label>
                <Input
                  id="cal-date"
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={selected}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    jump(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border bg-background p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fecha elegida
                </p>
                <p className="text-xl font-semibold mt-1 capitalize">
                  {format(selectedDate, "EEEE d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>

              {loadingPreview && !preview ? (
                <p className="text-sm text-muted-foreground">Calculando…</p>
              ) : preview ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Stat label="Edad" value={`${preview.retirementAge} años`} />
                    <Stat
                      label="Tipo"
                      value={
                        preview.isOrdinary
                          ? 'Ordinaria'
                          : preview.monthsEarly > 0
                            ? 'Anticipada'
                            : 'Demorada'
                      }
                    />
                    <Stat
                      label="Reducción"
                      value={
                        preview.reductionPercent > 0
                          ? `−${preview.reductionPercent}%`
                          : '0%'
                      }
                      warn={preview.reductionPercent > 0}
                    />
                    <Stat
                      label="Pensión est."
                      value={formatCurrency(preview.monthlyPension)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{preview.notes}</p>
                  <p className="text-xs text-muted-foreground">
                    BR {formatCurrency(preview.baseReguladora)} ·{' '}
                    {preview.percentageByYears.toFixed(1)}% por años ·{' '}
                    {preview.quality === 'full'
                      ? 'Bases documentadas'
                      : preview.quality === 'partial'
                        ? 'Bases + subsidio +52'
                        : 'Sin importe fiable'}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Elige una fecha válida.</p>
              )}

              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="cal-base">Base cotización futura (€/mes)</Label>
                <Input
                  id="cal-base"
                  type="number"
                  min={0}
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Escenario: desempleo → subsidio mayores 52 (base baja). No uses la de la
                  simulación SS (empleo continuo).
                </p>
              </div>

              <Button onClick={save} disabled={pending || loadingPreview} className="w-full">
                {pending ? 'Guardando…' : 'Guardar esta fecha'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {savedOnly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fechas guardadas ({savedOnly.length})</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Edad</th>
                  <th className="py-2 pr-2">Reducción</th>
                  <th className="py-2 pr-2">Pensión</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {savedOnly.map((s) => {
                  const meta = s.metadata ?? {};
                  return (
                    <tr key={s.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{s.name}</td>
                      <td className="py-2 pr-2">
                        {meta.retirementDate
                          ? format(new Date(meta.retirementDate), 'dd/MM/yyyy')
                          : '—'}
                      </td>
                      <td className="py-2 pr-2">{Number(s.retirement_age).toFixed(0)}</td>
                      <td className="py-2 pr-2 text-warning">
                        {meta.reductionPercent ? `−${meta.reductionPercent}%` : '0%'}
                      </td>
                      <td className="py-2 pr-2 font-semibold">
                        {formatCurrency(Number(s.monthly_pension))}
                      </td>
                      <td className="py-2 text-right space-x-2">
                        {meta.retirementDate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => jump(format(new Date(meta.retirementDate!), 'yyyy-MM-dd'))}
                          >
                            Ver
                          </Button>
                        )}
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold mt-0.5 ${warn ? 'text-warning' : ''}`}>{value}</p>
    </div>
  );
}
