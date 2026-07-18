import { formatPriceEur, splitVatIncluded } from './pricing';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface IssuerInfo {
  tradeName: string;
  legalName: string;
  taxId: string;
  address: string;
  email: string;
  web: string;
  phone?: string;
}

export const DEFAULT_ISSUER: IssuerInfo = {
  tradeName: 'PlanMiJubilación',
  legalName: process.env.BILLING_LEGAL_NAME ?? 'PlanMiJubilación',
  taxId: process.env.BILLING_TAX_ID ?? 'PENDIENTE',
  address: process.env.BILLING_ADDRESS ?? 'España',
  email:
    process.env.BILLING_EMAIL?.trim() ||
    process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
    'info@ramondelpozorott.es',
  web: process.env.NEXT_PUBLIC_APP_URL ?? 'https://planmijubilacion.es',
  phone: process.env.BILLING_PHONE,
};

/** Logo embebido (base64) para facturas/recibos imprimibles sin depender de red. */
let cachedLogoDataUri: string | null | undefined;

cachedLogoDataUri = undefined; // reset if HMR reloads module

function getLogoDataUri(): string | null {
  if (cachedLogoDataUri !== undefined) return cachedLogoDataUri;
  try {
    const pathPng = join(process.cwd(), 'public', 'logo1.png');
    const pathFallback = join(process.cwd(), 'public', 'logo.png');
    const path = existsSync(pathPng)
      ? pathPng
      : existsSync(pathFallback)
        ? pathFallback
        : join(process.cwd(), 'public', 'logo.webp');
    if (!existsSync(path)) {
      cachedLogoDataUri = null;
      return null;
    }
    const buf = readFileSync(path);
    const mime = path.endsWith('.webp') ? 'image/webp' : 'image/png';
    cachedLogoDataUri = `data:${mime};base64,${buf.toString('base64')}`;
    return cachedLogoDataUri;
  } catch {
    cachedLogoDataUri = null;
    return null;
  }
}

export interface BillingDocumentPayload {
  docType: 'invoice' | 'receipt' | 'report_cover';
  docNumber: string;
  issuedAt: string;
  clientName: string;
  clientEmail: string;
  clientTaxId?: string;
  clientAddress?: string;
  concept: string;
  totalCents: number;
  paymentMethod?: string;
  paymentDate?: string;
  status: 'paid' | 'pending';
  reportNumber?: string;
  verificationId: string;
}

function brandHeader(issuer: IssuerInfo): string {
  const logo = getLogoDataUri();
  const logoBlock = logo
    ? `<div class="logo-wrap"><img src="${logo}" alt="${escapeHtml(issuer.tradeName)}" class="logo-img" width="420" height="75" /></div>`
    : `<div class="logo-row">
      <div class="mark" aria-hidden="true">PM</div>
      <div>
        <div class="brand">${escapeHtml(issuer.tradeName)}</div>
        <div class="tag">Ecosistema PlanMi · Planificación de jubilación</div>
      </div>
    </div>`;

  return `
  <div class="header">
    ${logoBlock}
    <div class="meta">
      ${escapeHtml(issuer.legalName)} · NIF/CIF ${escapeHtml(issuer.taxId)}<br/>
      ${escapeHtml(issuer.address)} · ${escapeHtml(issuer.email)} · ${escapeHtml(issuer.web)}${
        issuer.phone ? ` · ${escapeHtml(issuer.phone)}` : ''
      }
    </div>
  </div>`;
}

function sharedStyles(): string {
  return `
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: #1c1917;
    max-width: 780px;
    margin: 0 auto;
    padding: 36px 28px 48px;
    line-height: 1.55;
    background: #fff;
  }
  .header {
    border-bottom: 2px solid #1c1917;
    padding-bottom: 18px;
    margin-bottom: 28px;
  }
  .logo-wrap {
    display: inline-block;
    padding: 0;
    background: transparent;
  }
  .logo-img {
    display: block;
    height: 72px;
    width: auto;
    max-width: 480px;
    object-fit: contain;
    object-position: left center;
  }
  .logo-row { display: flex; align-items: center; gap: 14px; }
  .mark {
    width: 48px; height: 48px; border-radius: 10px;
    background: #1c1917; color: #fafaf9;
    display: flex; align-items: center; justify-content: center;
    font-family: system-ui, sans-serif; font-weight: 700; font-size: 15px;
    letter-spacing: 0.04em;
  }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
  .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: #78716c; margin-top: 2px; }
  .meta { font-size: 12px; color: #57534e; margin-top: 12px; }
  .doc-title { font-size: 28px; font-weight: 700; margin: 8px 0 6px; letter-spacing: -0.02em; }
  .badge {
    display: inline-block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
    border: 1px solid #1c1917; padding: 4px 10px; margin-bottom: 18px;
  }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 20px 0 8px; }
  .box { border: 1px solid #e7e5e4; padding: 14px 16px; border-radius: 8px; }
  .box h3 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #78716c; font-weight: 600; }
  .box p { margin: 0; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; font-size: 14px; }
  th { text-align: left; padding: 10px 8px; border-bottom: 1px solid #1c1917; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #57534e; }
  td { padding: 12px 8px; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
  .totals { margin-left: auto; margin-top: 18px; width: 260px; font-size: 14px; }
  .totals td { border: 0; padding: 6px 0; }
  .totals .grand { font-weight: 700; font-size: 16px; border-top: 1px solid #1c1917; padding-top: 10px; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e7e5e4; font-size: 11px; color: #78716c; }
  @media print {
    body { padding: 0; max-width: none; }
  }
</style>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReceiptPayload(input: {
  docNumber: string;
  clientName: string;
  clientEmail: string;
  concept: string;
  totalCents: number;
  paymentMethod: string;
  paymentDate: string;
}): BillingDocumentPayload {
  return {
    docType: 'receipt',
    docNumber: input.docNumber,
    issuedAt: input.paymentDate,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    concept: input.concept,
    totalCents: input.totalCents,
    paymentMethod: input.paymentMethod,
    paymentDate: input.paymentDate,
    status: 'paid',
    verificationId: crypto.randomUUID(),
  };
}

export function buildInvoicePayload(input: {
  docNumber: string;
  clientName: string;
  clientEmail: string;
  clientTaxId?: string;
  clientAddress?: string;
  concept: string;
  totalCents: number;
  paymentMethod: string;
  paymentDate: string;
}): BillingDocumentPayload {
  return {
    docType: 'invoice',
    docNumber: input.docNumber,
    issuedAt: input.paymentDate,
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    clientTaxId: input.clientTaxId,
    clientAddress: input.clientAddress,
    concept: input.concept,
    totalCents: input.totalCents,
    paymentMethod: input.paymentMethod,
    paymentDate: input.paymentDate,
    status: 'paid',
    verificationId: crypto.randomUUID(),
  };
}

export function renderBillingDocumentHtml(
  payload: BillingDocumentPayload,
  issuer: IssuerInfo = DEFAULT_ISSUER
): string {
  const isInvoice = payload.docType === 'invoice';
  const title = isInvoice ? 'FACTURA' : 'RECIBO DE PAGO';
  const { subtotalCents, vatCents, totalCents } = splitVatIncluded(payload.totalCents);
  const dateEs = new Date(payload.issuedAt).toLocaleDateString('es-ES');
  const zero = totalCents === 0;

  const body = isInvoice
    ? `
    <table>
      <thead><tr>
        <th>Descripción</th>
        <th style="text-align:center">Cant.</th>
        <th style="text-align:right">Importe</th>
      </tr></thead>
      <tbody><tr>
        <td>${escapeHtml(payload.concept)}</td>
        <td style="text-align:center">1</td>
        <td style="text-align:right">${formatPriceEur(totalCents)}</td>
      </tr></tbody>
    </table>
    <table class="totals">
      <tr><td>Subtotal</td><td style="text-align:right">${formatPriceEur(subtotalCents)}</td></tr>
      <tr><td>IVA (21%)${zero ? ' *' : ''}</td><td style="text-align:right">${formatPriceEur(vatCents)}</td></tr>
      <tr class="grand"><td>Total</td><td style="text-align:right">${formatPriceEur(totalCents)}</td></tr>
    </table>
    <p style="margin-top:20px;font-size:13px"><strong>Forma de pago:</strong> ${escapeHtml(payload.paymentMethod ?? '—')}<br/>
    <strong>Fecha de pago:</strong> ${dateEs}<br/>
    <strong>Estado:</strong> PAGADA</p>
    ${zero ? '<p style="font-size:12px;color:#78716c">* Documento de cortesía / importe cero. Consulte a su asesor fiscal el tratamiento aplicable.</p>' : ''}
    `
    : `
    <div class="box" style="margin-top:20px">
      <h3>Detalle</h3>
      <p><strong>Concepto:</strong> ${escapeHtml(payload.concept)}</p>
      <p style="margin-top:8px"><strong>Importe:</strong> ${formatPriceEur(totalCents)}${zero ? '' : ' (IVA incluido si procede)'}</p>
      <p style="margin-top:8px"><strong>Método de pago:</strong> ${escapeHtml(payload.paymentMethod ?? '—')}</p>
      <p style="margin-top:8px"><strong>Estado:</strong> Pago realizado</p>
    </div>
    <p style="margin-top:24px;font-size:12px;color:#78716c">
      Este recibo acredita el pago del servicio contratado. <strong>No tiene validez como factura fiscal.</strong>
      ${payload.reportNumber ? `<br/>Informe asociado: ${escapeHtml(payload.reportNumber)}` : ''}
    </p>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>${title} ${escapeHtml(payload.docNumber)}</title>
${sharedStyles()}
</head><body>
${brandHeader(issuer)}
<div class="badge">${isInvoice ? 'Factura' : 'Recibo'}</div>
<div class="doc-title">${title}</div>
<div class="grid">
  <div class="box">
    <h3>Documento</h3>
    <p><strong>Número:</strong> ${escapeHtml(payload.docNumber)}<br/>
    <strong>Fecha:</strong> ${dateEs}</p>
  </div>
  <div class="box">
    <h3>Cliente</h3>
    <p><strong>${escapeHtml(payload.clientName)}</strong><br/>
    ${escapeHtml(payload.clientEmail)}
    ${payload.clientTaxId ? `<br/>NIF: ${escapeHtml(payload.clientTaxId)}` : ''}
    ${payload.clientAddress ? `<br/>${escapeHtml(payload.clientAddress)}` : ''}</p>
  </div>
</div>
${body}
<div class="footer">
  <p>ID verificación: ${escapeHtml(payload.verificationId)}</p>
  <p>Gracias por confiar en ${escapeHtml(issuer.tradeName)}. Documento generado automáticamente.</p>
  <p>Antes del cobro comercial, confirme con un asesor fiscal el tratamiento del IVA y los datos del emisor.</p>
</div>
</body></html>`;
}

export function renderReportCoverHtml(input: {
  clientName: string;
  clientEmail?: string;
  clientTaxId?: string;
  clientAddress?: string;
  reportNumber: string;
  issuedAt: string;
  title?: string;
  concept?: string;
  totalCents?: number;
  invoiceNumber?: string;
  receiptNumber?: string;
  verificationId?: string;
}): string {
  const issuer = DEFAULT_ISSUER;
  const dateEs = new Date(input.issuedAt).toLocaleDateString('es-ES');
  const concept = input.concept ?? input.title ?? 'Informe personalizado de jubilación';
  const verificationId = input.verificationId ?? crypto.randomUUID();
  const total =
    typeof input.totalCents === 'number' ? formatPriceEur(input.totalCents) : null;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>Informe ${escapeHtml(input.reportNumber)}</title>
${sharedStyles()}
</head><body>
${brandHeader(issuer)}
<div class="badge">Informe</div>
<div class="doc-title">INFORME</div>
<div class="grid">
  <div class="box">
    <h3>Documento</h3>
    <p><strong>Número:</strong> ${escapeHtml(input.reportNumber)}<br/>
    <strong>Fecha:</strong> ${dateEs}<br/>
    <strong>Tipo:</strong> Portada / informe de servicio</p>
  </div>
  <div class="box">
    <h3>Cliente</h3>
    <p><strong>${escapeHtml(input.clientName)}</strong>
    ${input.clientEmail ? `<br/>${escapeHtml(input.clientEmail)}` : ''}
    ${input.clientTaxId ? `<br/>NIF: ${escapeHtml(input.clientTaxId)}` : ''}
    ${input.clientAddress ? `<br/>${escapeHtml(input.clientAddress)}` : ''}</p>
  </div>
</div>
<table>
  <thead><tr>
    <th>Descripción</th>
    <th style="text-align:center">Cant.</th>
    <th style="text-align:right">Importe</th>
  </tr></thead>
  <tbody><tr>
    <td>${escapeHtml(concept)}</td>
    <td style="text-align:center">1</td>
    <td style="text-align:right">${total ?? '—'}</td>
  </tr></tbody>
</table>
<div class="box" style="margin-top:22px">
  <h3>Documentos asociados</h3>
  <p>
    ${input.invoiceNumber ? `<strong>Factura:</strong> ${escapeHtml(input.invoiceNumber)}<br/>` : ''}
    ${input.receiptNumber ? `<strong>Recibo:</strong> ${escapeHtml(input.receiptNumber)}<br/>` : ''}
    <strong>Informe:</strong> ${escapeHtml(input.reportNumber)}
  </p>
</div>
<p style="margin-top:24px;font-size:13px">
  Este documento es la portada del informe contratado. Acredita la emisión del servicio
  <strong>${escapeHtml(concept)}</strong> a favor de ${escapeHtml(input.clientName)}.
</p>
<div class="footer">
  <p>ID verificación: ${escapeHtml(verificationId)}</p>
  <p>${escapeHtml(issuer.legalName)} · NIF/CIF ${escapeHtml(issuer.taxId)} · ${escapeHtml(issuer.email)} · ${escapeHtml(issuer.web)}</p>
  <p>Gracias por confiar en ${escapeHtml(issuer.tradeName)}. Documento generado automáticamente.</p>
</div>
</body></html>`;
}

/** Logo público para componentes React imprimibles (misma marca que facturas). */
export function getPublicLogoPath(): string {
  return '/logo1.png';
}
