'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCurrencyExact } from '@/lib/utils';
import {
  WIZARD_STEPS,
  type WizardDraftState,
  type WizardStepId,
  type WizardDocKind,
  emptyWizardDraft,
} from '@/lib/asesoria-wizard/types';
import { loadWizardDraft, saveWizardDraft } from '@/lib/asesoria-wizard/storage';
import {
  personalStatsFromBirth,
  buildDateSimulation,
  buildComparisonTable,
  getOutlookSafe,
  type DateSimulationRow,
} from '@/lib/asesoria-wizard/simulate-at-date';
import {
  saveWizardBirthDateAction,
  uploadWizardDocumentAction,
} from '@/app/(app)/asesoria/wizard-actions';
import { InternationalCotizacionesWizard } from '@/components/features/international-cotizaciones-wizard';
import { SimulationCalculationBreakdown } from '@/components/features/asesoria-wizard/simulation-calculation-breakdown';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { InternationalCotizacionesData } from '@/lib/international-coordination/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

function stepIndex(id: WizardStepId) {
  return WIZARD_STEPS.findIndex((s) => s.id === id);
}

function Progress({ current }: { current: WizardStepId }) {
  const idx = stepIndex(current);
  return (
    <nav aria-label="Progreso del asistente" className="space-y-3">
      <ol className="flex flex-wrap gap-2">
        {WIZARD_STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id}>
              <span
                className={
                  active
                    ? 'inline-flex items-center rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background'
                    : done
                      ? 'inline-flex items-center rounded-full border border-foreground/30 px-3 py-1 text-xs font-medium'
                      : 'inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground'
                }
              >
                {s.short}
              </span>
            </li>
          );
        })}
      </ol>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={WIZARD_STEPS.length}
        aria-valuenow={idx + 1}
        aria-label={`Paso ${idx + 1} de ${WIZARD_STEPS.length}`}
      >
        <div
          className="h-full rounded-full bg-foreground transition-all"
          style={{ width: `${((idx + 1) / WIZARD_STEPS.length) * 100}%` }}
        />
      </div>
    </nav>
  );
}

async function enqueueProcess(documentId: string) {
  const res = await fetch('/api/documents/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, wait: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al encolar análisis');
}

export function AsesoriaSimulationWizard({
  initialExpediente,
  initialInternational,
  isFounder,
}: {
  initialExpediente: ExpedienteDigital | null;
  initialInternational: InternationalCotizacionesData | null;
  isFounder?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<WizardDraftState>(emptyWizardDraft);
  const [hydrated, setHydrated] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploadMsg, setUploadMsg] = useState('');
  const [expediente, setExpediente] = useState(initialExpediente);

  useEffect(() => {
    const loaded = loadWizardDraft();
    const fromExp = initialExpediente?.identificacion.fechaNacimiento?.value;
    // Fundador: siempre 02/08/1967 (nunca un draft antiguo de Carlos u otro familiar)
    if (isFounder) {
      loaded.birthDate = '1967-08-02';
    } else if (!loaded.birthDate && fromExp) {
      const dmy = fromExp.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dmy) loaded.birthDate = `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    }
    setDraft(loaded);
    setHydrated(true);
  }, [initialExpediente, isFounder]);

  useEffect(() => {
    if (!hydrated) return;
    saveWizardDraft(draft);
  }, [draft, hydrated]);

  useEffect(() => {
    setExpediente(initialExpediente);
  }, [initialExpediente]);

  const personal = useMemo(
    () => (draft.birthDate ? personalStatsFromBirth(draft.birthDate) : null),
    [draft.birthDate]
  );

  const outlook = useMemo(
    () => (expediente ? getOutlookSafe(expediente) : null),
    [expediente]
  );

  // Prefill fecha de jubilación con la ordinaria cuando hay outlook
  useEffect(() => {
    if (!hydrated || draft.retirementDate || !outlook?.ordinary?.date) return;
    const iso = format(new Date(outlook.ordinary.date), 'yyyy-MM-dd');
    setDraft((d) => (d.retirementDate ? d : { ...d, retirementDate: iso }));
  }, [hydrated, draft.retirementDate, outlook]);

  const selectedSim: DateSimulationRow | null = useMemo(() => {
    if (!expediente || !draft.retirementDate) return null;
    const d = new Date(draft.retirementDate + 'T12:00:00');
    if (Number.isNaN(d.getTime())) return null;
    return buildDateSimulation(expediente, d);
  }, [expediente, draft.retirementDate]);

  const comparison = useMemo(
    () => (expediente ? buildComparisonTable(expediente) : []),
    [expediente]
  );

  function go(step: WizardStepId) {
    setDraft((d) => ({ ...d, step }));
  }

  function next() {
    const i = stepIndex(draft.step);
    if (i < WIZARD_STEPS.length - 1) go(WIZARD_STEPS[i + 1]!.id);
  }

  function back() {
    const i = stepIndex(draft.step);
    if (i > 0) go(WIZARD_STEPS[i - 1]!.id);
  }

  function validatePersonal(): string | null {
    if (!draft.birthDate) return 'Indica tu fecha de nacimiento.';
    const d = new Date(draft.birthDate + 'T12:00:00');
    if (d > new Date()) return 'La fecha no puede ser futura.';
    if (personal && personal.ageYears < 18) return 'Debes ser mayor de 18 años.';
    return null;
  }

  function onContinuePersonal() {
    const err = validatePersonal();
    if (err) {
      toast.error(err);
      return;
    }
    startTransition(async () => {
      try {
        const saved = await saveWizardBirthDateAction(draft.birthDate);
        if (!saved.success) {
          toast.error(saved.error);
          return;
        }
        toast.success('Fecha de nacimiento guardada');
        router.refresh();
        next();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al guardar');
      }
    });
  }

  async function uploadDoc(kind: WizardDocKind, file: File) {
    setUploadMsg(`Subiendo ${file.name}…`);
    const fd = new FormData();
    fd.set('file', file);
    fd.set('kind', kind);
    const res = await uploadWizardDocumentAction(fd);
    if (!res.success) {
      throw new Error(res.error);
    }
    if (res.needsClientEnqueue) {
      setUploadMsg('Analizando con IA…');
      await enqueueProcess(res.documentId);
    }
    setDraft((d) => ({
      ...d,
      uploadedDocs: [
        ...d.uploadedDocs,
        {
          id: res.documentId,
          kind,
          name: file.name,
          status: res.spreadsheetOnly ? 'done' : 'queued',
          message: res.spreadsheetOnly
            ? 'Hoja guardada (extracción Excel/CSV en ampliación)'
            : 'En cola de análisis',
        },
      ],
    }));
    setUploadMsg('');
    toast.success(
      res.spreadsheetOnly
        ? 'Archivo guardado. La extracción CSV/Excel se ampliará; sube también PDF si puedes.'
        : 'Documento en análisis. El expediente se actualizará en unos segundos.'
    );
    router.refresh();
  }

  if (!hydrated) {
    return (
      <div className="rounded-xl border p-8 text-sm text-muted-foreground">
        Cargando tu progreso guardado…
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <header className="space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Mi plan · simulación guiada
        </p>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Simulación de jubilación (tu expediente)
        </h1>
        <p className="max-w-2xl text-muted-foreground leading-relaxed">
          Te acompañamos paso a paso con <strong>tus</strong> documentos y fechas. Esto actualiza
          tu plan personal, no una consulta de cliente.
        </p>
        {isFounder && (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm max-w-2xl space-y-1">
            <p className="font-medium text-accent">Modo fundador</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Esta pantalla es tu plan (Ramón). Para amigos o familiares usa{' '}
              <Link href="/asesoria/consultas" className="underline hover:text-foreground">
                Asesoría → Consultas de clientes
              </Link>
              .
            </p>
          </div>
        )}
      </header>

      <Progress current={draft.step} />

      <section
        className="rounded-2xl border bg-card p-6 md:p-8 space-y-6 shadow-sm"
        aria-labelledby="wizard-step-title"
      >
        <h2 id="wizard-step-title" className="text-xl font-semibold tracking-tight">
          {WIZARD_STEPS.find((s) => s.id === draft.step)?.label}
        </h2>

        {draft.step === 'personal' && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Solo necesitamos tu fecha de nacimiento para situar la edad y la horquilla de
              jubilación ordinaria. El resto saldrá de tus documentos.
            </p>
            <label className="block max-w-xs text-sm">
              <span className="text-muted-foreground">Fecha de nacimiento *</span>
              <input
                type="date"
                required
                value={draft.birthDate}
                onChange={(e) => setDraft((d) => ({ ...d, birthDate: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2.5 text-sm"
                aria-describedby="birth-help"
              />
              <span id="birth-help" className="mt-1 block text-xs text-muted-foreground">
                Usa el calendario del navegador (accesible con teclado).
              </span>
            </label>
            {personal && (
              <dl className="grid gap-3 sm:grid-cols-3 rounded-xl border bg-muted/30 p-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Edad actual</dt>
                  <dd className="text-lg font-semibold">{personal.ageYears} años</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Edad ordinaria orientativa</dt>
                  <dd className="text-lg font-semibold">~{personal.ordinaryAgeHint} años</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Tiempo restante (orientativo)</dt>
                  <dd className="text-lg font-semibold">
                    {personal.yearsUntilOrdinaryHint} a. {personal.monthsRemainderHint} m.
                  </dd>
                </div>
              </dl>
            )}
            <p className="text-xs text-muted-foreground">
              La edad ordinaria definitiva se ajustará con tus años cotizados (paso de documentos).
            </p>
          </div>
        )}

        {draft.step === 'documents' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Sube lo que tengas. Cuantos más documentos, más precisa la simulación. El análisis IA
              puede tardar unos segundos.
            </p>
            {(
              [
                {
                  kind: 'vida_laboral' as const,
                  title: 'Vida laboral',
                  desc: 'PDF. Extraemos empresas, altas/bajas, régimen, días y años cotizados, lagunas y tiempo parcial.',
                  accept: '.pdf,application/pdf,image/*',
                },
                {
                  kind: 'bases_cotizacion' as const,
                  title: 'Bases de cotización',
                  desc: 'PDF (recomendado), Excel o CSV. Extraemos bases mensuales para la base reguladora.',
                  accept:
                    '.pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
                {
                  kind: 'nomina' as const,
                  title: 'Última nómina',
                  desc: 'PDF. Extraemos bruto, grupo y bases de cotización cuando el documento lo permita.',
                  accept: '.pdf,application/pdf,image/*',
                },
              ] as const
            ).map((block) => (
              <div key={block.kind} className="rounded-xl border p-4 space-y-3">
                <div>
                  <h3 className="font-medium">{block.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{block.desc}</p>
                </div>
                <input
                  type="file"
                  accept={block.accept}
                  disabled={pending}
                  aria-label={`Subir ${block.title}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    startTransition(async () => {
                      try {
                        await uploadDoc(block.kind, file);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Error al subir');
                        setUploadMsg('');
                      }
                    });
                  }}
                  className="block w-full text-sm"
                />
              </div>
            ))}
            {uploadMsg && (
              <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                {uploadMsg}
              </p>
            )}
            {draft.uploadedDocs.length > 0 && (
              <ul className="text-sm space-y-1 rounded-lg border p-3">
                {draft.uploadedDocs.map((d) => (
                  <li key={d.id}>
                    <span className="font-medium">{d.name}</span>
                    <span className="text-muted-foreground"> — {d.message ?? d.status}</span>
                  </li>
                ))}
              </ul>
            )}
            {expediente && (
              <dl className="grid gap-2 sm:grid-cols-3 text-sm rounded-xl bg-muted/30 p-4">
                <div>
                  <dt className="text-muted-foreground">Años cotizados (exp.)</dt>
                  <dd className="font-semibold">
                    {expediente.resumen.anosCotizados?.value ?? '—'} a ·{' '}
                    {expediente.resumen.mesesCotizados?.value ?? 0} m
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Periodos</dt>
                  <dd className="font-semibold">{expediente.periodos.length}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Bases documentadas</dt>
                  <dd className="font-semibold">{expediente.bases.length}</dd>
                </div>
              </dl>
            )}
            <p className="text-xs text-muted-foreground">
              Puedes continuar y volver después. El progreso se guarda en este navegador.
            </p>
          </div>
        )}

        {draft.step === 'international' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Si has cotizado fuera de España (p. ej. Alemania), decláralo aquí. La arquitectura ya
              contempla convenios; los importes extranjeros solo se suman si aportas la carta
              oficial.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={draft.hasWorkedAbroad === true ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, hasWorkedAbroad: true }))}
              >
                Sí, he trabajado fuera
              </Button>
              <Button
                type="button"
                variant={draft.hasWorkedAbroad === false ? 'primary' : 'secondary'}
                size="sm"
                onClick={() =>
                  setDraft((d) => ({ ...d, hasWorkedAbroad: false, foreignPeriods: [] }))
                }
              >
                No
              </Button>
            </div>
            {draft.hasWorkedAbroad && (
              <InternationalCotizacionesWizard initial={initialInternational} />
            )}
          </div>
        )}

        {draft.step === 'retirement' && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Elige cualquier fecha futura. La simulación se recalcula al cambiar la fecha.
            </p>
            {outlook && (
              <p className="text-sm rounded-lg border bg-muted/30 px-3 py-2">
                Ordinaria estimada:{' '}
                <strong>
                  {outlook.ordinary.date
                    ? new Date(outlook.ordinary.date).toLocaleDateString('es-ES')
                    : '—'}
                </strong>
                {outlook.ordinary.ageYears != null && (
                  <> · edad {outlook.ordinary.ageYears.toFixed(1)} años</>
                )}
              </p>
            )}
            <label className="block max-w-xs text-sm">
              <span className="text-muted-foreground">Fecha deseada de jubilación</span>
              <input
                type="date"
                value={draft.retirementDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDraft((d) => ({ ...d, retirementDate: e.target.value }))}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2.5 text-sm"
              />
            </label>
            {!expediente?.resumen.anosCotizados?.value && (
              <p className="text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                Aún no hay años cotizados en el expediente. Sube la vida laboral para una
                simulación fiable.
              </p>
            )}
            {selectedSim && (
              <div className="rounded-xl border p-4 space-y-2 text-sm">
                <p>
                  <strong>{selectedSim.modalityLabel}</strong>
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Edad en esa fecha: {selectedSim.age} años</li>
                  <li>
                    Adelanto: {selectedSim.monthsEarly} meses · Reducción:{' '}
                    {selectedSim.reductionPercent}%
                  </li>
                  <li>
                    Pensión estimada:{' '}
                    {selectedSim.monthlyPension != null
                      ? `${formatCurrencyExact(selectedSim.monthlyPension)}/mes`
                      : '—'}
                  </li>
                </ul>
                <p className="text-xs">{selectedSim.notes}</p>
              </div>
            )}
          </div>
        )}

        {draft.step === 'summary' && (
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Revisa los datos. Puedes volver a cualquier paso sin perder el progreso.
            </p>
            <dl className="space-y-3 rounded-xl border divide-y">
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Nacimiento</dt>
                <dd className="font-medium">{draft.birthDate || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Documentos subidos</dt>
                <dd className="font-medium">{draft.uploadedDocs.length}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Cotización exterior</dt>
                <dd className="font-medium">
                  {draft.hasWorkedAbroad === true
                    ? 'Sí'
                    : draft.hasWorkedAbroad === false
                      ? 'No'
                      : 'Sin indicar'}
                </dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Fecha jubilación</dt>
                <dd className="font-medium">{draft.retirementDate || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-3">
                <dt className="text-muted-foreground">Carrera en expediente</dt>
                <dd className="font-medium">
                  {expediente?.resumen.anosCotizados?.value ?? '—'} años
                </dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              {WIZARD_STEPS.filter((s) => s.id !== 'summary' && s.id !== 'result').map((s) => (
                <Button key={s.id} type="button" size="sm" variant="secondary" onClick={() => go(s.id)}>
                  Editar: {s.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {draft.step === 'result' && (
          <div className="space-y-6">
            {!selectedSim ? (
              <p className="text-sm text-muted-foreground">
                Faltan datos para simular. Completa nacimiento, documentos y fecha de jubilación.
              </p>
            ) : (
              <>
                <div className="rounded-2xl bg-foreground text-background p-6 space-y-4">
                  <p className="text-xs uppercase tracking-wide opacity-80">
                    Pensión mensual estimada
                  </p>
                  <p className="text-4xl font-semibold tabular-nums">
                    {selectedSim.monthlyPension != null
                      ? formatCurrencyExact(selectedSim.monthlyPension)
                      : '—'}
                    <span className="text-base font-normal opacity-80"> / mes</span>
                  </p>
                  <p className="text-sm opacity-90">
                    {selectedSim.annualPension != null &&
                      `${formatCurrencyExact(selectedSim.annualPension)} / año (14 pagas)`}
                  </p>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Fecha ordinaria</dt>
                    <dd className="font-medium">
                      {outlook?.ordinary.date
                        ? new Date(outlook.ordinary.date).toLocaleDateString('es-ES')
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Fecha seleccionada</dt>
                    <dd className="font-medium">{selectedSim.retirementDateLabel}</dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Tipo</dt>
                    <dd className="font-medium">{selectedSim.modalityLabel}</dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Edad</dt>
                    <dd className="font-medium">{selectedSim.age} años</dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Años cotizados (exp.)</dt>
                    <dd className="font-medium">
                      {expediente?.resumen.anosCotizados?.value ?? '—'} a ·{' '}
                      {expediente?.resumen.mesesCotizados?.value ?? 0} m
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Base reguladora</dt>
                    <dd className="font-medium">
                      {selectedSim.baseReguladora != null
                        ? formatCurrencyExact(selectedSim.baseReguladora)
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">% por años</dt>
                    <dd className="font-medium">
                      {selectedSim.percentageByYears != null
                        ? `${selectedSim.percentageByYears}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg border p-3">
                    <dt className="text-muted-foreground">Penalización anticipada</dt>
                    <dd className="font-medium">
                      {selectedSim.monthsEarly > 0
                        ? `${selectedSim.reductionPercent}% (${selectedSim.monthsEarly} meses)`
                        : '0 %'}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">{selectedSim.notes}</p>
              </>
            )}

            {comparison.length > 0 && (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <caption className="sr-only">Comparativa de fechas de jubilación</caption>
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2 font-medium">Fecha</th>
                      <th className="px-3 py-2 font-medium">Modalidad</th>
                      <th className="px-3 py-2 font-medium">Penalización</th>
                      <th className="px-3 py-2 font-medium">Pensión est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((r) => (
                      <tr key={r.label} className="border-t">
                        <td className="px-3 py-2">{r.label}</td>
                        <td className="px-3 py-2">{r.modalityLabel}</td>
                        <td className="px-3 py-2">{r.reductionPercent} %</td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.monthlyPension != null
                            ? `${formatCurrencyExact(r.monthlyPension)}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <SimulationCalculationBreakdown row={selectedSim} />

            <p className="text-xs text-muted-foreground">
              Simulación orientativa con coeficientes oficiales BOE (arts. 207/208 LGSS). No
              sustituye la resolución de la Seguridad Social.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-between gap-3 pt-2 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={back}
            disabled={draft.step === 'personal' || pending}
          >
            Atrás
          </Button>
          <div className="flex gap-2">
            {draft.step === 'personal' && (
              <Button type="button" onClick={onContinuePersonal} disabled={pending}>
                {pending ? 'Guardando…' : 'Continuar'}
              </Button>
            )}
            {draft.step !== 'personal' &&
              draft.step !== 'result' &&
              draft.step !== 'summary' && (
              <Button
                type="button"
                onClick={() => {
                  if (draft.step === 'retirement' && !draft.retirementDate) {
                    toast.error('Elige una fecha de jubilación');
                    return;
                  }
                  next();
                }}
                disabled={pending}
              >
                Continuar
              </Button>
            )}
            {draft.step === 'summary' && (
              <Button type="button" onClick={() => go('result')}>
                Ver simulación
              </Button>
            )}
            {draft.step === 'result' && (
              <Button type="button" variant="secondary" onClick={() => go('retirement')}>
                Cambiar fecha
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
