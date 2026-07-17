'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SELECTABLE_COUNTRIES, getCountryName } from '@/lib/international-coordination/catalog';
import type {
  ForeignCotizationPeriod,
  InternationalCotizacionesData,
} from '@/lib/international-coordination/types';
import { saveInternationalCotizacionesAction } from '@/app/(app)/jubilacion/actions';
import { saveConsultationInternationalAction } from '@/app/(app)/asesoria/actions';
import { toast } from 'sonner';
import { newId } from '@/lib/expediente/types';

type Step = 1 | 2 | 3 | 4;

function emptyPeriod(code: string): ForeignCotizationPeriod {
  return {
    id: newId(),
    countryCode: code,
    countryName: getCountryName(code),
    yearsContributed: null,
    approximateStart: null,
    approximateEnd: null,
    stillContributing: false,
    pensionAlreadyRequested: false,
    documentedMonthlyPensionEur: null,
    documentedPensionSource: null,
    documentedPensionDate: null,
  };
}

export function InternationalCotizacionesWizard({
  initial,
  caseId,
}: {
  initial?: InternationalCotizacionesData | null;
  /** Si se indica, guarda en la consulta de asesoría (amigo/familiar). */
  caseId?: string;
}) {
  const [step, setStep] = useState<Step>(initial?.hasWorkedAbroad ? 4 : 1);
  const [hasAbroad, setHasAbroad] = useState(initial?.hasWorkedAbroad ?? false);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(
    initial?.periods.map((p) => p.countryCode) ?? []
  );
  const [periods, setPeriods] = useState<ForeignCotizationPeriod[]>(
    (initial?.periods ?? []).map((p) => ({
      ...emptyPeriod(p.countryCode),
      ...p,
      documentedMonthlyPensionEur: p.documentedMonthlyPensionEur ?? null,
    }))
  );
  const [pending, setPending] = useState(false);

  const periodByCode = useMemo(() => {
    const m = new Map(periods.map((p) => [p.countryCode, p]));
    return m;
  }, [periods]);

  function toggleCountry(code: string) {
    setSelectedCodes((prev) => {
      if (prev.includes(code)) {
        setPeriods((ps) => ps.filter((p) => p.countryCode !== code));
        return prev.filter((c) => c !== code);
      }
      setPeriods((ps) => [...ps, emptyPeriod(code)]);
      return [...prev, code];
    });
  }

  function updatePeriod(code: string, patch: Partial<ForeignCotizationPeriod>) {
    setPeriods((ps) => ps.map((p) => (p.countryCode === code ? { ...p, ...patch } : p)));
  }

  async function save(andFinish = false) {
    setPending(true);
    try {
      const fd = new FormData();
      fd.set('hasWorkedAbroad', String(hasAbroad));
      if (hasAbroad) {
        fd.set('periodsJson', JSON.stringify(periods));
      }
      if (caseId) {
        const res = await saveConsultationInternationalAction(caseId, fd);
        if (!res.success) {
          toast.error(res.error);
          return;
        }
      } else {
        await saveInternationalCotizacionesAction(fd);
      }
      toast.success('Datos internacionales guardados');
      if (andFinish) setStep(4);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border p-5 space-y-5 print:hidden">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Cotizaciones internacionales
        </p>
        <h2 className="text-lg font-semibold">
          {caseId ? 'Trabajo en el extranjero (amigo / familiar)' : 'Asistente de coordinación'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Paso {step} de 4 · España + otros países (p. ej. Alemania). Puede introducir el importe
          de la carta oficial extranjera para sumarlo a la pensión española.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">¿Ha cotizado fuera de España?</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={hasAbroad ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setHasAbroad(true)}
            >
              Sí
            </Button>
            <Button
              type="button"
              variant={!hasAbroad ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setHasAbroad(false);
                setSelectedCodes([]);
                setPeriods([]);
              }}
            >
              No
            </Button>
          </div>
          <div className="flex justify-end gap-2">
            {!hasAbroad ? (
              <Button type="button" disabled={pending} onClick={() => save(true)}>
                Guardar y continuar
              </Button>
            ) : (
              <Button type="button" onClick={() => setStep(2)}>
                Siguiente
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 2 && hasAbroad && (
        <div className="space-y-4">
          <p className="text-sm font-medium">¿En qué países ha cotizado?</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto pr-1">
            {SELECTABLE_COUNTRIES.map((c) => (
              <label
                key={c.code}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedCodes.includes(c.code)}
                  onChange={() => toggleCountry(c.code)}
                  className="rounded"
                />
                {c.name}
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCodes.length === 0}
              onClick={() => setStep(3)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {step === 3 && hasAbroad && (
        <div className="space-y-6">
          {selectedCodes.map((code) => {
            const p = periodByCode.get(code) ?? emptyPeriod(code);
            return (
              <fieldset key={code} className="rounded-lg border p-4 space-y-3">
                <legend className="px-1 text-sm font-semibold">{getCountryName(code)}</legend>
                <label className="block text-sm">
                  <span className="text-muted-foreground">Años cotizados (aprox.)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={p.yearsContributed ?? ''}
                    onChange={(e) =>
                      updatePeriod(code, {
                        yearsContributed: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Desde (aprox.)</span>
                    <input
                      type="month"
                      value={p.approximateStart ?? ''}
                      onChange={(e) =>
                        updatePeriod(code, { approximateStart: e.target.value || null })
                      }
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Hasta (aprox.)</span>
                    <input
                      type="month"
                      value={p.approximateEnd ?? ''}
                      onChange={(e) =>
                        updatePeriod(code, { approximateEnd: e.target.value || null })
                      }
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.stillContributing}
                    onChange={(e) => updatePeriod(code, { stillContributing: e.target.checked })}
                    className="rounded"
                  />
                  Sigue cotizando allí
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={p.pensionAlreadyRequested}
                    onChange={(e) =>
                      updatePeriod(code, { pensionAlreadyRequested: e.target.checked })
                    }
                    className="rounded"
                  />
                  Ya ha solicitado / recibido previsión de pensión en ese país
                </label>

                <div className="rounded-lg border border-dashed bg-muted/30 p-3 space-y-3">
                  <p className="text-sm font-medium">
                    Importe de la carta / resolución extranjera
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Si Alemania (u otro país) ya le ha enviado lo que va a percibir, introdúzcalo
                    aquí. Se sumará a la estimación española. No inventamos cifras.
                  </p>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Pensión mensual (€)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={p.documentedMonthlyPensionEur ?? ''}
                      onChange={(e) =>
                        updatePeriod(code, {
                          documentedMonthlyPensionEur: e.target.value
                            ? Number(e.target.value)
                            : null,
                        })
                      }
                      placeholder="Ej. 420,50"
                      className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Documento / organismo</span>
                    <input
                      type="text"
                      value={p.documentedPensionSource ?? ''}
                      onChange={(e) =>
                        updatePeriod(code, {
                          documentedPensionSource: e.target.value || null,
                        })
                      }
                      placeholder="Ej. Carta Deutsche Rentenversicherung"
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Fecha del documento</span>
                    <input
                      type="month"
                      value={p.documentedPensionDate ?? ''}
                      onChange={(e) =>
                        updatePeriod(code, {
                          documentedPensionDate: e.target.value || null,
                        })
                      }
                      className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </fieldset>
            );
          })}
          <div className="flex justify-between">
            <Button type="button" variant="secondary" size="sm" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={() => save(true)}>
              Guardar y ver resumen
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Los años en España y en países con coordinación (UE, EEE, Suiza o convenio) pueden
            totalizarse para requisitos de acceso. Cada país calcula y paga su parte. Si ya tiene
            la carta extranjera, el importe se suma a la estimación española para ver el total a
            percibir.
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setStep(1)}>
            Editar respuestas
          </Button>
        </div>
      )}
    </div>
  );
}
