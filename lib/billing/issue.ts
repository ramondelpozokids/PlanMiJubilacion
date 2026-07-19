/**
 * Emisión de pedidos + factura + recibo + portada de informe.
 * Sin Stripe: pago marcado como realizado (manual / fundador / prepago).
 */
import { createServiceClient } from '@/lib/supabase/service';
import { createClient } from '@/lib/supabase/server';
import {
  buildInvoicePayload,
  buildReceiptPayload,
  DEFAULT_ISSUER,
  renderBillingDocumentHtml,
  renderReportCoverHtml,
} from '@/lib/billing/documents';
import { formatDocumentNumber } from '@/lib/billing/document-number';
import { getPricingRule, resolvePrice } from '@/lib/billing/repository';
import type { DiscountMode, ServiceKey } from '@/lib/international-coordination/types';

export interface IssueBillingInput {
  userId: string;
  clientName: string;
  clientEmail: string;
  clientTaxId?: string;
  clientAddress?: string;
  serviceKey: ServiceKey;
  discountMode?: DiscountMode;
  paymentMethod?: string;
  notes?: string;
  /** Vincula factura/pedido a una consulta de familiar/amigo. */
  consultationCaseId?: string | null;
}

export interface IssuedBillingBundle {
  orderId: string;
  invoiceId: string;
  receiptId: string;
  reportCoverId: string;
  invoiceNumber: string;
  receiptNumber: string;
  reportNumber: string;
  amountCents: number;
  discountMode: DiscountMode;
}

async function allocateNumber(prefix: 'FAC' | 'REC' | 'INF'): Promise<string> {
  const admin = createServiceClient();
  const { data, error } = await admin.rpc('next_document_number', { p_prefix: prefix });
  if (!error && typeof data === 'string' && data.length > 0) return data;

  // Fallback sin RPC (migración 009 pendiente)
  const year = new Date().getFullYear();
  const { data: row } = await admin
    .from('document_sequences')
    .select('last_number')
    .eq('prefix', prefix)
    .eq('year', year)
    .maybeSingle();

  const next = (row?.last_number ?? 0) + 1;
  const { error: upErr } = await admin.from('document_sequences').upsert(
    { prefix, year, last_number: next },
    { onConflict: 'prefix,year' }
  );
  if (upErr) throw new Error(`No se pudo asignar número ${prefix}: ${upErr.message}`);
  return formatDocumentNumber(prefix, year, next);
}

export async function issueBillingDocuments(
  input: IssueBillingInput
): Promise<IssuedBillingBundle> {
  const rule = await getPricingRule(input.serviceKey);
  const { finalCents, mode } = resolvePrice(rule, input.discountMode);
  const paymentDate = new Date().toISOString();
  const paymentMethod =
    input.paymentMethod ??
    (mode === 'free' ? 'Cortesía / sin cargo' : 'Pago manual (pendiente Stripe)');

  const concept =
    mode === 'free'
      ? `${rule.label} (gratuito)`
      : mode === 'reduced'
        ? `${rule.label} (precio reducido)`
        : rule.label;

  const [invoiceNumber, receiptNumber, reportNumber] = await Promise.all([
    allocateNumber('FAC'),
    allocateNumber('REC'),
    allocateNumber('INF'),
  ]);

  const invoicePayload = buildInvoicePayload({
    docNumber: invoiceNumber,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientTaxId: input.clientTaxId,
    clientAddress: input.clientAddress,
    concept,
    totalCents: finalCents,
    paymentMethod,
    paymentDate,
  });
  invoicePayload.reportNumber = reportNumber;

  const receiptPayload = buildReceiptPayload({
    docNumber: receiptNumber,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    concept,
    totalCents: finalCents,
    paymentMethod,
    paymentDate,
  });
  receiptPayload.reportNumber = reportNumber;

  const invoiceHtml = renderBillingDocumentHtml(invoicePayload, DEFAULT_ISSUER);
  const receiptHtml = renderBillingDocumentHtml(receiptPayload, DEFAULT_ISSUER);
  const reportVerificationId = crypto.randomUUID();
  const coverHtml = renderReportCoverHtml({
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientTaxId: input.clientTaxId,
    clientAddress: input.clientAddress,
    reportNumber,
    issuedAt: paymentDate,
    title: rule.label,
    concept,
    totalCents: finalCents,
    invoiceNumber,
    receiptNumber,
    verificationId: reportVerificationId,
  });

  const admin = createServiceClient();

  const { data: order, error: orderErr } = await admin
    .from('service_orders')
    .insert({
      user_id: input.userId,
      service_key: input.serviceKey,
      status: 'paid',
      amount_cents: finalCents,
      discount_mode: mode,
      paid_at: paymentDate,
      consultation_case_id: input.consultationCaseId ?? null,
      metadata: {
        notes: input.notes ?? null,
        paymentMethod,
        invoiceNumber,
        receiptNumber,
        reportNumber,
        consultationCaseId: input.consultationCaseId ?? null,
      },
    })
    .select('id')
    .single();

  if (orderErr || !order) {
    throw new Error(orderErr?.message ?? 'No se pudo crear el pedido');
  }

  const docs = [
    {
      user_id: input.userId,
      order_id: order.id,
      doc_type: 'invoice',
      doc_number: invoiceNumber,
      payload: invoicePayload,
      html_snapshot: invoiceHtml,
      consultation_case_id: input.consultationCaseId ?? null,
    },
    {
      user_id: input.userId,
      order_id: order.id,
      doc_type: 'receipt',
      doc_number: receiptNumber,
      payload: receiptPayload,
      html_snapshot: receiptHtml,
      consultation_case_id: input.consultationCaseId ?? null,
    },
    {
      user_id: input.userId,
      order_id: order.id,
      doc_type: 'report_cover',
      doc_number: reportNumber,
      payload: {
        docType: 'report_cover',
        docNumber: reportNumber,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientTaxId: input.clientTaxId,
        clientAddress: input.clientAddress,
        concept,
        totalCents: finalCents,
        issuedAt: paymentDate,
        status: 'paid',
        verificationId: reportVerificationId,
        reportNumber,
        invoiceNumber,
        receiptNumber,
        consultationCaseId: input.consultationCaseId ?? null,
      },
      html_snapshot: coverHtml,
      consultation_case_id: input.consultationCaseId ?? null,
    },
  ];

  const { data: inserted, error: docsErr } = await admin
    .from('billing_documents')
    .insert(docs)
    .select('id, doc_type, doc_number');

  if (docsErr || !inserted?.length) {
    throw new Error(docsErr?.message ?? 'No se pudieron guardar los documentos');
  }

  const byType = Object.fromEntries(inserted.map((d) => [d.doc_type, d]));

  return {
    orderId: order.id,
    invoiceId: byType.invoice?.id ?? '',
    receiptId: byType.receipt?.id ?? '',
    reportCoverId: byType.report_cover?.id ?? '',
    invoiceNumber,
    receiptNumber,
    reportNumber,
    amountCents: finalCents,
    discountMode: mode,
  };
}

export async function getBillingDocumentForUser(userId: string, docId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('billing_documents')
    .select('id, doc_type, doc_number, payload, html_snapshot, created_at, order_id')
    .eq('id', docId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
