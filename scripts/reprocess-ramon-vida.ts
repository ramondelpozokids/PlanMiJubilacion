/**
 * Releer vida laboral de Ramón (Mi plan) con días COMPUTABLES.
 * Uso: npx tsx scripts/reprocess-ramon-vida.ts
 */
import fs from 'fs';
import path from 'path';
import { extractPdfText } from '../lib/pdf/extract-text';
import { parseVidaLaboralFromText } from '../lib/ai/parse-vida-laboral';
import { toFullDocumentExtraction, mergeVidaLaboral } from '../lib/ai/vida-laboral-full';
import type { VidaLaboralCompleta, FullDocumentExtraction } from '../lib/ai/vida-laboral-types';
import { enrichVidaLaboralFromRawText } from '../lib/ocr/enrich-vida-laboral';
import { normalizeByDocumentType } from '../lib/expediente/normalize';
import { mergeDocumentIntoExpediente } from '../lib/expediente/merge';
import { applyCrossValidation } from '../lib/validation';
import { finalizeExpediente } from '../lib/expediente/finalize';
import { emptyExpediente, type ExpedienteDigital } from '../lib/expediente/types';
import { applyFounderIdentity } from '../lib/admin/founder-identity';
import { FOUNDER } from '../lib/admin/config';

const VL_CANDIDATES = [
  'C:/Users/X/Documents/Vida laboral/vida_laboral.pdf',
  'C:/Users/X/Desktop/Desempleo/vida_laboral.pdf',
  'C:/Users/X/Desktop/SEPE/Vida laboral Ramón.pdf',
];

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function restHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function restGet<T>(url: string, key: string, pathQuery: string): Promise<T> {
  const res = await fetch(`${url}/rest/v1/${pathQuery}`, { headers: restHeaders(key) });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function restPatch(url: string, key: string, pathQuery: string, body: unknown) {
  const res = await fetch(`${url}/rest/v1/${pathQuery}`, {
    method: 'PATCH',
    headers: restHeaders(key),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function restPost<T>(url: string, key: string, table: string, body: unknown): Promise<T> {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...restHeaders(key), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return (Array.isArray(data) ? data[0] : data) as T;
}

async function storageUpload(
  url: string,
  key: string,
  storagePath: string,
  buf: Buffer
): Promise<void> {
  const res = await fetch(`${url}/storage/v1/object/documents/${storagePath}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/pdf',
      'x-upsert': 'true',
    },
    body: new Uint8Array(buf),
  });
  if (!res.ok) {
    const t = await res.text();
    if (!/already exists|Duplicate/i.test(t)) console.warn('storage:', t);
  }
}

function emptyInforme(): VidaLaboralCompleta {
  return {
    documentType: 'vida_laboral',
    identificacion: {
      nombre: null,
      dni: null,
      nie: null,
      numeroAfiliacion: null,
      fechaNacimiento: null,
      edad: null,
      direccion: null,
      localidad: null,
      provincia: null,
      codigoPostal: null,
    },
    resumen: {
      totalDiasCotizacion: null,
      anosCotizados: null,
      mesesCotizados: null,
      diasRestantes: null,
      regimenPrincipal: null,
      situacionActual: null,
      fechaInforme: null,
      diasAltaTotal: null,
      diasPluriempleo: null,
    },
    periodosContrato: [],
    periodosAutonomo: [],
    prestacionesDesempleo: [],
    situacionesAsimiladas: [],
    lagunas: [],
    basesCotizacion: [],
    otrosDatos: {},
    paginasProcesadas: 0,
    totalPeriodosExtraidos: 0,
  };
}

function resolveVlPath(): string {
  for (const p of VL_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  // Fallback: any SEPE vida laboral*
  const sepeDir = 'C:/Users/X/Desktop/SEPE';
  if (fs.existsSync(sepeDir)) {
    const hit = fs
      .readdirSync(sepeDir)
      .find((n) => /vida\s*laboral/i.test(n) && /\.pdf$/i.test(n));
    if (hit) return path.join(sepeDir, hit);
  }
  throw new Error('No se encontró PDF de vida laboral de Ramón');
}

type DocRow = {
  id: string;
  name: string;
  document_type: string;
  storage_path: string;
  consultation_case_id: string | null;
};

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan credenciales Supabase en .env.local');

  const vlPath = resolveVlPath();
  console.log('PDF:', vlPath);

  const buf = fs.readFileSync(vlPath);
  const { text, totalPages } = await extractPdfText(buf);
  const parsed = parseVidaLaboralFromText(text, 'vida_laboral');
  const informe = mergeVidaLaboral(emptyInforme(), {
    ...parsed,
    paginasProcesadas: totalPages,
    otrosDatos: { modo: 'reprocess_ramon_local' },
  });
  let extraction: FullDocumentExtraction = toFullDocumentExtraction(informe, text, 0.95);
  extraction = enrichVidaLaboralFromRawText(extraction, 'vida_laboral');

  console.log(
    JSON.stringify(
      {
        nombre: extraction.informeCompleto.identificacion.nombre,
        diasComputables: extraction.informeCompleto.resumen.totalDiasCotizacion,
        anos: extraction.informeCompleto.resumen.anosCotizados,
        meses: extraction.informeCompleto.resumen.mesesCotizados,
        diasRestantes: extraction.informeCompleto.resumen.diasRestantes,
        fechaInforme: extraction.informeCompleto.resumen.fechaInforme,
        diasAlta: extraction.informeCompleto.resumen.diasAltaTotal,
        pluriempleo: extraction.informeCompleto.resumen.diasPluriempleo,
        contratos: extraction.informeCompleto.periodosContrato.length,
        autonomos: extraction.informeCompleto.periodosAutonomo.length,
        asimiladas: extraction.informeCompleto.situacionesAsimiladas.length,
        desempleo: extraction.informeCompleto.prestacionesDesempleo.length,
        situacion: extraction.informeCompleto.resumen.situacionActual,
      },
      null,
      2
    )
  );

  const profiles = await restGet<Array<{ id: string; email: string }>>(
    url,
    key,
    `profiles?select=id,email&or=(email.eq.${FOUNDER.email},email.eq.info@ramondelpozorott.es)`
  );
  if (!profiles.length) throw new Error(`No hay perfil para ${FOUNDER.email}`);
  const founder =
    profiles.find((p) => p.email.toLowerCase() === FOUNDER.email.toLowerCase()) ?? profiles[0];
  console.log(`Fundador: ${founder.email} (${founder.id})`);

  const expRows = await restGet<Array<{ user_id: string; data: ExpedienteDigital | null }>>(
    url,
    key,
    `expedientes?select=user_id,data&user_id=eq.${founder.id}`
  );

  let expediente: ExpedienteDigital =
    expRows[0]?.data?.userId ? expRows[0].data : emptyExpediente(founder.id);

  const docs = await restGet<DocRow[]>(
    url,
    key,
    `documents?select=id,name,document_type,storage_path,consultation_case_id&user_id=eq.${founder.id}&consultation_case_id=is.null&order=created_at.desc`
  );

  let doc =
    docs.find((d) => /vida.?laboral/i.test(d.name) || d.document_type === 'vida_laboral') ?? null;

  if (!doc) {
    const storagePath = `${founder.id}/vida_laboral-ramon.pdf`;
    await storageUpload(url, key, storagePath, buf);
    doc = await restPost<DocRow>(url, key, 'documents', {
      user_id: founder.id,
      name: 'vida_laboral.pdf',
      mime_type: 'application/pdf',
      size_bytes: buf.length,
      storage_path: storagePath,
      document_type: 'vida_laboral',
      ocr_status: 'completed',
      ocr_data: extraction,
      ocr_confidence: 0.95,
    });
  } else {
    await restPatch(url, key, `documents?id=eq.${doc.id}`, {
      ocr_status: 'completed',
      ocr_error: null,
      ocr_data: extraction,
      ocr_confidence: 0.95,
      document_type: 'vida_laboral',
    });
  }

  // Quitar periodos/prestaciones previos de este doc y re-fusionar
  expediente = {
    ...expediente,
    periodos: (expediente.periodos ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === doc!.id)
    ),
    prestaciones: (expediente.prestaciones ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === doc!.id)
    ),
  };

  const normalized = normalizeByDocumentType(
    extraction,
    doc.id,
    doc.name || 'vida_laboral.pdf',
    'vida_laboral'
  );

  expediente = mergeDocumentIntoExpediente(
    expediente,
    normalized,
    doc.id,
    doc.name || 'vida_laboral.pdf'
  );
  applyFounderIdentity(expediente);
  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente, 'reprocess-ramon');

  await restPatch(url, key, `expedientes?user_id=eq.${founder.id}`, {
    data: expediente,
    version: expediente.version,
    completitud_score: expediente.completitud.score,
    updated_at: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: founder.id,
        periodos: expediente.periodos.length,
        prestaciones: expediente.prestaciones.length,
        bases: expediente.bases.length,
        anos: expediente.resumen.anosCotizados?.value,
        meses: expediente.resumen.mesesCotizados?.value,
        diasComputables: expediente.resumen.totalDiasCotizacion?.value,
        diasAlta: expediente.resumen.diasAltaTotal?.value,
        pluriempleo: expediente.resumen.diasPluriempleo?.value,
        score: expediente.completitud.score,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
