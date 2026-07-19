import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { PrintButton } from '@/components/features/print-button';
import type { ClientDossierReport } from '@/lib/reports/build-client-dossier-report';
import { formatCurrencyExact } from '@/lib/utils';
import type { ReactNode } from 'react';

function money(n: number | null | undefined): string {
  return n != null ? formatCurrencyExact(n) : '—';
}

function moneyFromString(s: string | null | undefined): string {
  if (s == null) return '—';
  const n = Number(s);
  return Number.isFinite(n) ? formatCurrencyExact(n) : '—';
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="px-6 pb-6 print:px-0 break-inside-avoid">
      <h3 className="text-sm font-semibold mb-2 border-b pb-1">
        {title}
        {count != null ? (
          <span className="ml-2 font-normal text-muted-foreground">({count})</span>
        ) : null}
      </h3>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

/**
 * Informe-dossier imprimible: toda la documentación + cálculo de jubilación.
 * PDF vía window.print (mismo flujo que factura / informe de jubilación).
 */
export function ClientDossierPrintReport({
  report,
}: {
  report: ClientDossierReport;
}) {
  const { issuer, retirement } = report;
  const { real, officialSs } = retirement;

  return (
    <Card className="print-root border-2 border-foreground/20 overflow-hidden">
      <CardContent className="p-0">
        <div className="border-b px-6 py-5 print:px-0 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- print PDF needs plain img */}
              <img
                src="/logo1.png"
                alt={issuer.tradeName}
                width={420}
                height={75}
                className="h-[72px] w-auto max-w-[480px] object-contain object-left"
              />
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                {issuer.legalName} · NIF/CIF {issuer.taxId}
                <br />
                {issuer.address} · {issuer.email} · {issuer.web}
                {issuer.phone ? ` · ${issuer.phone}` : ''}
              </p>
            </div>
            <div className="text-right text-sm shrink-0">
              <PrintButton label="Imprimir / guardar PDF" variant="primary" />
              <p className="mt-2 font-mono text-xs">{report.reportNumber}</p>
              <p className="text-xs text-muted-foreground">{report.issuedAtLabel}</p>
            </div>
          </div>
          <div>
            <span className="inline-block rounded border px-2 py-1 text-[11px] uppercase tracking-wide">
              {report.variant === 'consultation'
                ? 'Informe-dossier de asesoría'
                : 'Informe-dossier personal'}
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Expediente completo de jubilación
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Incluye toda la documentación aportada (vida laboral, bases, nóminas, IRPF,
              extranjero, etc.), periodos, prestaciones y el cálculo estimado de pensión.
            </p>
          </div>
        </div>

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 print:px-0">
          <div className="rounded-lg border p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Emisor</p>
            <p className="mt-1 font-medium">{issuer.legalName}</p>
            <p className="text-sm text-muted-foreground">
              NIF/CIF {issuer.taxId}
              <br />
              {issuer.address}
              <br />
              {issuer.email}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Titular</p>
            <p className="mt-1 font-medium">{report.clientName}</p>
            <p className="text-sm text-muted-foreground">
              {retirement.clientDni ? `DNI/NIE ${retirement.clientDni}` : 'DNI/NIE —'}
              <br />
              {retirement.clientBirth ? `Nacimiento ${retirement.clientBirth}` : 'Nacimiento —'}
              <br />
              Carrera: {report.carreraLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-3 px-6 pb-5 sm:grid-cols-2 lg:grid-cols-4 print:px-0">
          <Metric label="Jubilación ordinaria" value={retirement.retirementDateLabel} />
          <Metric label="Edad" value={retirement.retirementAgeLabel} />
          <Metric label="Pagas anuales" value={report.paymentsLabel} />
          <Metric
            label="Pensión bruta / mes"
            value={money(real.monthlyBruto)}
          />
        </div>

        {report.summaryLines.length > 0 && (
          <Section title="Resumen para el cliente">
            <ul className="space-y-1.5 text-sm">
              {report.summaryLines.map((line) => (
                <li key={line} className="text-muted-foreground leading-relaxed">
                  · {line}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="1. Identificación">
          {report.identification.length === 0 ? (
            <Empty text="Sin datos de identificación fusionados." />
          ) : (
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
              {report.identification.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-border/40 py-1">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-medium text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title="2. Resumen de cotización">
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-sm">
            {report.resumenCotizacion.map((row) => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-border/40 py-1">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-right">{row.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="3. Documentación aportada" count={report.documents.length}>
          {report.documents.length === 0 ? (
            <Empty text="No hay PDFs listados para este expediente. Sube vida laboral, bases u otros documentos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Archivo</th>
                    <th className="py-2 pr-2">Estado OCR</th>
                    <th className="py-2">Subido</th>
                  </tr>
                </thead>
                <tbody>
                  {report.documents.map((d) => (
                    <tr key={d.id} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{d.typeLabel}</td>
                      <td className="py-2 pr-2 break-all">{d.name}</td>
                      <td className="py-2 pr-2">{d.status ?? '—'}</td>
                      <td className="py-2 whitespace-nowrap">{d.uploadedAtLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Cualquier documento adicional (nómina, declaración de la renta / IRPF, carta
            extranjera, certificado de empresa, etc.) se incorpora automáticamente a este
            inventario al subirlo al expediente.
          </p>
        </Section>

        <Section title="4. Vida laboral — periodos (alta / baja)" count={report.periodos.length}>
          {report.periodos.length === 0 ? (
            <Empty text="Sin periodos. Relee el informe de vida laboral." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Alta</th>
                    <th className="py-2 pr-2">Baja</th>
                    <th className="py-2 pr-2">Empresa</th>
                    <th className="py-2 pr-2">CCC</th>
                    <th className="py-2 pr-2">Régimen</th>
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Días</th>
                    <th className="py-2">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.periodos.map((p, i) => (
                    <tr key={`${p.alta}-${p.empresa}-${i}`} className="border-b border-border/40 align-top">
                      <td className="py-2 pr-2 tabular-nums whitespace-nowrap">{p.alta}</td>
                      <td className="py-2 pr-2 tabular-nums whitespace-nowrap">{p.baja}</td>
                      <td className="py-2 pr-2">{p.empresa}</td>
                      <td className="py-2 pr-2 text-xs">{p.ccc}</td>
                      <td className="py-2 pr-2">{p.regimen}</td>
                      <td className="py-2 pr-2">{p.tipo !== '—' ? p.tipo : p.categoria}</td>
                      <td className="py-2 pr-2 tabular-nums">{p.dias}</td>
                      <td className="py-2 text-xs text-muted-foreground max-w-[140px] break-all">
                        {p.origen}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="5. Prestaciones / paro" count={report.prestaciones.length}>
          {report.prestaciones.length === 0 ? (
            <Empty text="Sin prestaciones documentadas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Organismo</th>
                    <th className="py-2 pr-2">Inicio</th>
                    <th className="py-2 pr-2">Fin</th>
                    <th className="py-2 pr-2">Días</th>
                    <th className="py-2 pr-2">Importe</th>
                    <th className="py-2">Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {report.prestaciones.map((p, i) => (
                    <tr key={`${p.tipo}-${p.inicio}-${i}`} className="border-b border-border/40">
                      <td className="py-2 pr-2">{p.tipo}</td>
                      <td className="py-2 pr-2">{p.organismo}</td>
                      <td className="py-2 pr-2 tabular-nums">{p.inicio}</td>
                      <td className="py-2 pr-2 tabular-nums">{p.fin}</td>
                      <td className="py-2 pr-2 tabular-nums">{p.dias}</td>
                      <td className="py-2 pr-2 tabular-nums">{moneyFromString(p.importe)}</td>
                      <td className="py-2 text-xs text-muted-foreground">{p.origen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="6. Certificados y resoluciones" count={report.resoluciones.length}>
          {report.resoluciones.length === 0 ? (
            <Empty text="Sin certificados / resoluciones." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Organismo</th>
                    <th className="py-2 pr-2">Fecha</th>
                    <th className="py-2 pr-2">Resumen</th>
                    <th className="py-2 pr-2">Importe</th>
                    <th className="py-2">Documento</th>
                  </tr>
                </thead>
                <tbody>
                  {report.resoluciones.map((r, i) => (
                    <tr key={`${r.tipo}-${r.fecha}-${i}`} className="border-b border-border/40 align-top">
                      <td className="py-2 pr-2">{r.tipo}</td>
                      <td className="py-2 pr-2">{r.organismo}</td>
                      <td className="py-2 pr-2 tabular-nums whitespace-nowrap">{r.fecha}</td>
                      <td className="py-2 pr-2 max-w-[280px]">{r.resumen}</td>
                      <td className="py-2 pr-2 tabular-nums">{moneyFromString(r.importe)}</td>
                      <td className="py-2 text-xs text-muted-foreground">{r.origen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="7. Lagunas de cotización" count={report.lagunas.length}>
          {report.lagunas.length === 0 ? (
            <Empty text="Sin lagunas registradas en el expediente." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Desde</th>
                    <th className="py-2 pr-2">Hasta</th>
                    <th className="py-2">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lagunas.map((l, i) => (
                    <tr key={`${l.desde}-${i}`} className="border-b border-border/40">
                      <td className="py-2 pr-2 tabular-nums">{l.desde}</td>
                      <td className="py-2 pr-2 tabular-nums">{l.hasta}</td>
                      <td className="py-2 tabular-nums">{l.dias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="8. Bases de cotización" count={report.basesCount}>
          {report.basesCount === 0 ? (
            <Empty text="Sin bases. Relee el Informe Integral de Bases de Cotización." />
          ) : (
            <>
              <p className="text-sm mb-3">
                Suma documentada:{' '}
                <span className="font-semibold tabular-nums">{money(report.basesSum)}</span>
                <span className="text-muted-foreground">
                  {' '}
                  · {report.basesCount} meses
                  {report.basesCount > 0
                    ? ` · media ${money(report.basesSum / report.basesCount)}`
                    : ''}
                </span>
              </p>
              <div className="overflow-x-auto max-h-[32rem] print:max-h-none">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">Periodo</th>
                      <th className="py-2 pr-2 text-right">Base</th>
                      <th className="py-2 pr-2">Régimen</th>
                      <th className="py-2 pr-2">Empresa</th>
                      <th className="py-2">Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.bases.map((b, i) => (
                      <tr key={`${b.periodo}-${i}`} className="border-b border-border/40">
                        <td className="py-1.5 pr-2 tabular-nums font-medium">{b.periodo}</td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">{money(b.base)}</td>
                        <td className="py-1.5 pr-2">{b.regimen}</td>
                        <td className="py-1.5 pr-2">{b.empresa}</td>
                        <td className="py-1.5 text-xs text-muted-foreground">{b.origen}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        <Section title="9. Cotizaciones internacionales" count={report.international.length}>
          {report.international.length === 0 ? (
            <Empty text="Sin periodos en el extranjero declarados." />
          ) : (
            <>
              {report.internationalNote && (
                <p className="text-sm text-muted-foreground mb-2">{report.internationalNote}</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">País</th>
                      <th className="py-2 pr-2">Años</th>
                      <th className="py-2 pr-2">Fechas</th>
                      <th className="py-2 pr-2">Pensión doc. / mes</th>
                      <th className="py-2">Fuente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.international.map((row, i) => (
                      <tr key={`${row.country}-${i}`} className="border-b border-border/40">
                        <td className="py-2 pr-2 font-medium">{row.country}</td>
                        <td className="py-2 pr-2">{row.years}</td>
                        <td className="py-2 pr-2">{row.dates}</td>
                        <td className="py-2 pr-2 tabular-nums">
                          {money(row.documentedMonthly)}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{row.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Section>

        <Section title="10. Cálculo de pensión (bruto y neto)">
          <p className="text-sm text-muted-foreground mb-3">
            Modalidad: {retirement.modalityLabel}. Cobro en {report.paymentsLabel}.
          </p>
          {(retirement.lifePathTramos.paro || retirement.lifePathTramos.subsidio) && (
            <div className="mb-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <p className="font-medium">Escenario hasta la jubilación</p>
              {retirement.lifePathTramos.paro && (
                <p className="mt-1 text-muted-foreground">1. {retirement.lifePathTramos.paro}</p>
              )}
              {retirement.lifePathTramos.subsidio && (
                <p className="text-muted-foreground">2. {retirement.lifePathTramos.subsidio}</p>
              )}
            </div>
          )}
          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Concepto</th>
                  <th className="py-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2">Base reguladora</td>
                  <td className="py-2 text-right tabular-nums">{money(real.baseReguladora)}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2">
                    % por años
                    {real.percentageByYears != null
                      ? ` (${real.percentageByYears.toFixed(1)} %)`
                      : ''}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {real.percentageByYears != null
                      ? `${real.percentageByYears.toFixed(1)} %`
                      : '—'}
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2 font-medium">Pensión bruta / mes</td>
                  <td className="py-2 text-right tabular-nums font-semibold">
                    {money(real.monthlyBruto)}
                  </td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2">Bruto anual ({retirement.annualPayments} pagas)</td>
                  <td className="py-2 text-right tabular-nums">{money(real.annualBruto)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {real.irpfRows.length > 0 && (
            <>
              <p className="text-sm font-medium mb-2">Neto tras IRPF (orientativo)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-2">Retención</th>
                      <th className="py-2 pr-2 text-right">IRPF / mes</th>
                      <th className="py-2 pr-2 text-right">Neto / mes</th>
                      <th className="py-2 text-right">Neto anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {real.irpfRows.map((row) => (
                      <tr key={row.retentionPct} className="border-b border-border/40">
                        <td className="py-2 pr-2">{row.retentionPct} %</td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {money(row.irpfMonthly)}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums font-medium">
                          {money(row.netMonthly)}
                        </td>
                        <td className="py-2 text-right tabular-nums">{money(row.netAnnual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {officialSs.monthlyBruto != null && (
            <div className="mt-4 rounded-lg border border-dashed px-4 py-3 text-sm">
              <p className="font-medium">Referencia simulación oficial SS</p>
              <p className="mt-1 tabular-nums">
                {money(officialSs.monthlyBruto)} / mes · {money(officialSs.annualBruto)} / año
                {officialSs.dateLabel ? ` · ${officialSs.dateLabel}` : ''}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{officialSs.note}</p>
            </div>
          )}
        </Section>

        {report.outlook && report.outlook.ordinary.ssSteps.length > 0 && (
          <Section title="11. Cómo calcula la Seguridad Social">
            <ol className="space-y-2 text-sm">
              {report.outlook.ordinary.ssSteps.map((step) => (
                <li key={step.title}>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {report.outlook && report.outlook.earlyVoluntary.scenarios.length > 0 && (
          <Section title="12. Anticipada voluntaria — coeficientes">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Momento</th>
                    <th className="py-2 pr-2">Fecha</th>
                    <th className="py-2 pr-2">Meses antes</th>
                    <th className="py-2 pr-2">Reducción</th>
                    <th className="py-2">Pensión est. / mes</th>
                  </tr>
                </thead>
                <tbody>
                  {report.outlook.earlyVoluntary.scenarios.map((s) => (
                    <tr key={s.label} className="border-b border-border/40">
                      <td className="py-2 pr-2 font-medium">{s.label}</td>
                      <td className="py-2 pr-2 tabular-nums">
                        {formatDateSafe(s.retirementDate)}
                      </td>
                      <td className="py-2 pr-2">{s.monthsEarly}</td>
                      <td className="py-2 pr-2">−{s.reductionPercent}%</td>
                      <td className="py-2 tabular-nums">{money(s.estimatedMonthly)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {(report.discrepancies.length > 0 || report.pendingQuestions.length > 0) && (
          <Section title="13. Alertas y pendientes">
            {report.discrepancies.length > 0 && (
              <ul className="mb-3 space-y-1 text-sm">
                {report.discrepancies.map((d, i) => (
                  <li key={`${d.field}-${i}`} className="text-muted-foreground">
                    [{d.severity}] {d.field}: {d.message}
                  </li>
                ))}
              </ul>
            )}
            {report.pendingQuestions.map((q, i) => (
              <p key={i} className="text-sm text-muted-foreground mb-1">
                ({q.priority}) {q.question} — {q.reason}
              </p>
            ))}
          </Section>
        )}

        {report.advisorSummary && (
          <Section title="Notas del asesor">
            <p className="text-sm leading-relaxed text-muted-foreground">{report.advisorSummary}</p>
          </Section>
        )}

        <div className="border-t px-6 py-4 text-xs text-muted-foreground space-y-1 print:px-0">
          <p>{report.disclaimer}</p>
          <p>
            Nº informe {report.reportNumber} · ID verificación {report.verificationId} ·{' '}
            {issuer.legalName} · {issuer.web}
          </p>
          <p>
            Gracias por confiar en {issuer.tradeName}. Documento generado automáticamente a partir
            de los archivos facilitados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-sm leading-snug">{value}</p>
    </div>
  );
}

function formatDateSafe(d: Date): string {
  try {
    return format(d, 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}
