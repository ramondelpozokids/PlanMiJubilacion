import { Card, CardContent } from '@/components/ui/card';
import { PrintButton } from '@/components/features/print-button';
import type { RetirementPrintReport } from '@/lib/reports/build-retirement-print-report';
import { formatCurrencyExact } from '@/lib/utils';

function money(n: number | null | undefined): string {
  return n != null ? formatCurrencyExact(n) : '—';
}

/**
 * Informe imprimible (PDF vía imprimir del navegador) con logo y datos
 * al mismo nivel que factura / recibo.
 */
export function RetirementPrintReport({
  report,
  variant = 'self',
}: {
  report: RetirementPrintReport;
  variant?: 'self' | 'consultation';
}) {
  const { issuer, real, officialSs } = report;

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
              {variant === 'consultation' ? 'Informe de asesoría' : 'Informe personal'}
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Informe de jubilación
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {issuer.tradeName} · documento imprimible / PDF (mismo formato que factura y recibo)
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
              <br />
              {issuer.web}
              {issuer.phone ? (
                <>
                  <br />
                  {issuer.phone}
                </>
              ) : null}
            </p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Titular</p>
            <p className="mt-1 font-medium">{report.clientName}</p>
            <p className="text-sm text-muted-foreground">
              {report.clientDni ? `DNI/NIE ${report.clientDni}` : 'DNI/NIE —'}
              <br />
              {report.clientBirth ? `Nacimiento ${report.clientBirth}` : 'Nacimiento —'}
            </p>
          </div>
        </div>

        <div className="px-6 pb-2 print:px-0">
          <span className="inline-block rounded border px-2 py-1 text-[11px] uppercase tracking-wide">
            {report.modalityLabel}
          </span>
        </div>

        <div className="grid gap-3 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4 print:px-0">
          <Metric label="Fecha de jubilación" value={report.retirementDateLabel} />
          <Metric label="Edad" value={report.retirementAgeLabel} />
          <Metric label="Pagas anuales" value={String(report.annualPayments)} />
          <Metric
            label="Reducción anticipada"
            value={
              real.reductionPercent > 0 ? `−${real.reductionPercent} %` : '0 %'
            }
          />
        </div>

        {(report.lifePathTramos.paro || report.lifePathTramos.subsidio) && (
          <div className="mx-6 mb-4 rounded-lg border bg-muted/20 px-4 py-3 text-sm print:mx-0">
            <p className="font-medium">Escenario de cotización hasta la jubilación</p>
            {report.lifePathTramos.paro && (
              <p className="mt-1 text-muted-foreground">1. {report.lifePathTramos.paro}</p>
            )}
            {report.lifePathTramos.subsidio && (
              <p className="text-muted-foreground">2. {report.lifePathTramos.subsidio}</p>
            )}
          </div>
        )}

        <div className="px-6 pb-4 print:px-0">
          <h3 className="text-sm font-semibold mb-2">
            {variant === 'consultation'
              ? `Escenario de ${report.clientName} (bases + paro / subsidio +52)`
              : 'Tu escenario (bases + paro / subsidio +52)'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Concepto</th>
                  <th className="py-2 pr-2 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2">Base reguladora</td>
                  <td className="py-2 text-right tabular-nums">{money(real.baseReguladora)}</td>
                </tr>
                <tr className="border-b border-border/40">
                  <td className="py-2 pr-2">
                    % por años cotizados
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
                  <td className="py-2 pr-2">Bruto anual ({report.annualPayments} pagas)</td>
                  <td className="py-2 text-right tabular-nums">{money(real.annualBruto)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 pb-4 print:px-0">
          <h3 className="text-sm font-semibold mb-2">Neto tras IRPF (orientativo)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
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
        </div>

        {officialSs.monthlyBruto != null && (
          <div className="mx-6 mb-4 rounded-lg border border-dashed px-4 py-3 text-sm print:mx-0">
            <p className="font-medium">Referencia simulación oficial Seguridad Social</p>
            <p className="mt-1 tabular-nums">
              {money(officialSs.monthlyBruto)} / mes · {money(officialSs.annualBruto)} / año (
              {report.annualPayments} pagas)
              {officialSs.dateLabel ? ` · fecha ${officialSs.dateLabel}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{officialSs.note}</p>
          </div>
        )}

        <div className="border-t px-6 py-4 text-xs text-muted-foreground space-y-1 print:px-0">
          <p>{report.disclaimer}</p>
          <p>
            Nº informe {report.reportNumber} · ID verificación {report.verificationId} ·{' '}
            {issuer.legalName} · {issuer.web}
          </p>
          <p>
            Gracias por confiar en {issuer.tradeName}. Documento generado automáticamente.
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
