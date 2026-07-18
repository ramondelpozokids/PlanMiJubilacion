/**
 * One-shot: releer vida laboral de Carlos y volcarla en su consulta de asesoría.
 * Uso: npx tsx scripts/reprocess-carlos-vida.ts
 */
import fs from 'fs';
import path from 'path';
import { extractPdfText } from '../lib/pdf/extract-text';
import { parseVidaLaboralFromText } from '../lib/ai/parse-vida-laboral';
import { toFullDocumentExtraction, mergeVidaLaboral } from '../lib/ai/vida-laboral-full';
import type { VidaLaboralCompleta } from '../lib/ai/vida-laboral-types';
import { normalizeByDocumentType } from '../lib/expediente/normalize';
import { mergeDocumentIntoExpediente } from '../lib/expediente/merge';
import { applyCrossValidation } from '../lib/validation';
import { finalizeExpediente } from '../lib/expediente/finalize';
import { emptyExpediente, type ExpedienteDigital } from '../lib/expediente/types';

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
): Promise<string> {
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
    // ya existe → ok
    if (!/already exists|Duplicate/i.test(t)) console.warn('storage:', t);
  }
  return storagePath;
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

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan credenciales Supabase en .env.local');

  const pdfPath = 'C:/Users/X/Pictures/Carlos/vida_laboral.pdf';
  if (!fs.existsSync(pdfPath)) throw new Error(`No existe ${pdfPath}`);

  const buf = fs.readFileSync(pdfPath);
  const { text, totalPages } = await extractPdfText(buf);
  const parsed = parseVidaLaboralFromText(text, 'vida_laboral');
  if (parsed.periodosContrato.length >= parsed.periodosAutonomo.length) {
    parsed.resumen.regimenPrincipal = 'general';
  }

  const informe = mergeVidaLaboral(emptyInforme(), {
    ...parsed,
    paginasProcesadas: totalPages,
    otrosDatos: { modo: 'reprocess_carlos_local' },
  });
  const extraction = toFullDocumentExtraction(informe, text, 0.9);

  console.log(
    JSON.stringify(
      {
        nombre: informe.identificacion.nombre,
        dni: informe.identificacion.dni,
        dias: informe.resumen.totalDiasCotizacion,
        anos: informe.resumen.anosCotizados,
        contratos: informe.periodosContrato.length,
        autonomos: informe.periodosAutonomo.length,
        asimiladas: informe.situacionesAsimiladas.length,
        desempleo: informe.prestacionesDesempleo.length,
      },
      null,
      2
    )
  );

  type CaseRow = {
    id: string;
    founder_id: string;
    client_name: string;
    expediente_data: ExpedienteDigital | null;
  };

  const cases = await restGet<CaseRow[]>(
    url,
    key,
    'consultation_cases?select=id,founder_id,client_name,expediente_data&client_name=ilike.*Carlos*&order=updated_at.desc'
  );
  if (!cases.length) throw new Error('No hay consulta con nombre Carlos');

  const caseRow =
    cases.find((c) => /rodriguez|kobe/i.test(c.client_name)) ?? cases[0];
  console.log(`Consulta: ${caseRow.client_name} (${caseRow.id})`);

  type DocRow = { id: string; name: string; document_type: string; storage_path: string };
  const docs = await restGet<DocRow[]>(
    url,
    key,
    `documents?select=id,name,document_type,storage_path&consultation_case_id=eq.${caseRow.id}&order=created_at.desc`
  );

  let doc =
    docs.find((d) => /vida.?laboral/i.test(d.name) || d.document_type === 'vida_laboral') ?? null;

  if (!doc) {
    const storagePath = `${caseRow.founder_id}/consultas/${caseRow.id}/vida_laboral-carlos.pdf`;
    await storageUpload(url, key, storagePath, buf);
    doc = await restPost<DocRow>(url, key, 'documents', {
      user_id: caseRow.founder_id,
      name: 'vida_laboral.pdf',
      mime_type: 'application/pdf',
      size_bytes: buf.length,
      storage_path: storagePath,
      document_type: 'vida_laboral',
      ocr_status: 'completed',
      consultation_case_id: caseRow.id,
      ocr_data: extraction,
      ocr_confidence: 0.9,
    });
  } else {
    await restPatch(url, key, `documents?id=eq.${doc.id}`, {
      ocr_status: 'completed',
      ocr_error: null,
      ocr_data: extraction,
      ocr_confidence: 0.9,
      document_type: 'vida_laboral',
    });
  }

  const normalized = normalizeByDocumentType(
    extraction,
    doc.id,
    doc.name || 'vida_laboral.pdf',
    'vida_laboral'
  );

  let expediente: ExpedienteDigital =
    caseRow.expediente_data?.userId
      ? caseRow.expediente_data
      : emptyExpediente(caseRow.founder_id);

  expediente = {
    ...expediente,
    periodos: (expediente.periodos ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === doc!.id)
    ),
    prestaciones: (expediente.prestaciones ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === doc!.id)
    ),
  };

  expediente = mergeDocumentIntoExpediente(
    expediente,
    normalized,
    doc.id,
    doc.name || 'vida_laboral.pdf'
  );
  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente, doc.name || 'vida_laboral.pdf');

  await restPatch(url, key, `consultation_cases?id=eq.${caseRow.id}`, {
    expediente_data: expediente,
    completitud_score: expediente.completitud.score,
    updated_at: new Date().toISOString(),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        caseId: caseRow.id,
        documentId: doc.id,
        periodosEnExpediente: expediente.periodos.length,
        prestaciones: expediente.prestaciones.length,
        anos: expediente.resumen.anosCotizados?.value,
        meses: expediente.resumen.mesesCotizados?.value,
        score: expediente.completitud.score,
        url: `/asesoria/${caseRow.id}`,
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
