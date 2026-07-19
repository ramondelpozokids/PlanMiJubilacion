import Link from 'next/link';
import { IssueDocumentsForm } from '@/components/features/issue-documents-form';
import type { BillingDocumentRow } from '@/lib/billing/repository';
import type { PricingRule } from '@/lib/international-coordination/types';
import { formatPriceEur } from '@/lib/billing/pricing';

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice: 'Factura',
  receipt: 'Recibo',
  report_cover: 'Portada informe',
};

/**
 * Emitir factura ligada a la consulta + listado de documentos ya emitidos.
 */
export function ConsultationBillingPanel({
  caseId,
  clientName,
  defaultEmail,
  pricing,
  isFounder,
  linkedDocuments,
}: {
  caseId: string;
  clientName: string;
  defaultEmail: string;
  pricing: PricingRule[];
  isFounder: boolean;
  linkedDocuments: BillingDocumentRow[];
}) {
  const invoices = linkedDocuments.filter((d) => d.docType === 'invoice');

  return (
    <div className="space-y-4 print:hidden">
      <IssueDocumentsForm
        pricing={pricing}
        defaultName={clientName}
        defaultEmail={defaultEmail}
        isFounder={isFounder}
        consultationCaseId={caseId}
        compactTitle={`Factura de esta consulta · ${clientName}`}
      />

      {linkedDocuments.length > 0 && (
        <div className="rounded-xl border p-4 space-y-3">
          <h3 className="font-semibold">Documentos de cobro vinculados</h3>
          <ul className="space-y-2 text-sm">
            {linkedDocuments.map((d) => {
              const total = typeof d.payload.totalCents === 'number' ? d.payload.totalCents : null;
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {DOC_TYPE_LABEL[d.docType] ?? d.docType} ·{' '}
                      <span className="font-mono text-xs">{d.docNumber}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString('es-ES')}
                      {total != null ? ` · ${formatPriceEur(total)}` : ''}
                    </p>
                  </div>
                  <Link
                    href={`/informes/${d.id}`}
                    className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
                  >
                    Abrir
                  </Link>
                </li>
              );
            })}
          </ul>
          {invoices.length > 0 && (
            <p className="text-xs text-muted-foreground">
              El nº de factura más reciente se refleja en el cierre comercial del dossier al
              regenerar la página.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
