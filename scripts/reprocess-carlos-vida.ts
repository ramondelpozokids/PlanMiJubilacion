/**
 * Releer vida laboral + bases de Carlos y volcarlas en su consulta.
 * Uso: npx tsx scripts/reprocess-carlos-vida.ts
 */
import fs from 'fs';
import path from 'path';
import { extractPdfText } from '../lib/pdf/extract-text';
import { parseVidaLaboralFromText } from '../lib/ai/parse-vida-laboral';
import { toFullDocumentExtraction, mergeVidaLaboral } from '../lib/ai/vida-laboral-full';
import type { VidaLaboralCompleta } from '../lib/ai/vida-laboral-types';
import { enrichBasesFromRawText } from '../lib/ocr/enrich-bases';
import { enrichVidaLaboralFromRawText } from '../lib/ocr/enrich-vida-laboral';
import { normalizeByDocumentType } from '../lib/expediente/normalize';
import { mergeDocumentIntoExpediente } from '../lib/expediente/merge';
import { applyCrossValidation } from '../lib/validation';
import { finalizeExpediente } from '../lib/expediente/finalize';
import { emptyExpediente, type ExpedienteDigital } from '../lib/expediente/types';
import type { FullDocumentExtraction } from '../lib/ai/vida-laboral-types';

const VL_PATH = 'C:/Users/X/Pictures/Carlos/vida_laboral.pdf';
const BASES_PATH = 'C:/Users/X/Pictures/Carlos/Informe Bases Cotización Online.pdf';

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

type CaseRow = {
  id: string;
  founder_id: string;
  client_name: string;
  expediente_data: ExpedienteDigital | null;
};

type DocRow = { id: string; name: string; document_type: string; storage_path: string };

async function upsertDoc(
  url: string,
  key: string,
  caseRow: CaseRow,
  docs: DocRow[],
  opts: {
    match: (d: DocRow) => boolean;
    name: string;
    documentType: 'vida_laboral' | 'bases_cotizacion';
    storageFile: string;
    buf: Buffer;
    extraction: FullDocumentExtraction;
  }
): Promise<DocRow> {
  let doc = docs.find(opts.match) ?? null;
  if (!doc) {
    const storagePath = `${caseRow.founder_id}/consultas/${caseRow.id}/${opts.storageFile}`;
    await storageUpload(url, key, storagePath, opts.buf);
    doc = await restPost<DocRow>(url, key, 'documents', {
      user_id: caseRow.founder_id,
      name: opts.name,
      mime_type: 'application/pdf',
      size_bytes: opts.buf.length,
      storage_path: storagePath,
      document_type: opts.documentType,
      ocr_status: 'completed',
      consultation_case_id: caseRow.id,
      ocr_data: opts.extraction,
      ocr_confidence: 0.92,
    });
  } else {
    await restPatch(url, key, `documents?id=eq.${doc.id}`, {
      ocr_status: 'completed',
      ocr_error: null,
      ocr_data: opts.extraction,
      ocr_confidence: 0.92,
      document_type: opts.documentType,
    });
  }
  return doc;
}

function stripDoc(expediente: ExpedienteDigital, docId: string): ExpedienteDigital {
  return {
    ...expediente,
    periodos: (expediente.periodos ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === docId)
    ),
    prestaciones: (expediente.prestaciones ?? []).filter(
      (p) => !p.sources?.some((s) => s.documentId === docId)
    ),
    bases: (expediente.bases ?? []).filter(
      (b) => !b.sources?.some((s) => s.documentId === docId)
    ),
  };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan credenciales Supabase en .env.local');
  if (!fs.existsSync(VL_PATH)) throw new Error(`No existe ${VL_PATH}`);
  if (!fs.existsSync(BASES_PATH)) throw new Error(`No existe ${BASES_PATH}`);

  const vlBuf = fs.readFileSync(VL_PATH);
  const basesBuf = fs.readFileSync(BASES_PATH);

  const vlExtract = await extractPdfText(vlBuf);
  const basesExtract = await extractPdfText(basesBuf);

  const parsedVl = parseVidaLaboralFromText(vlExtract.text, 'vida_laboral');
  const informe = mergeVidaLaboral(emptyInforme(), {
    ...parsedVl,
    paginasProcesadas: vlExtract.totalPages,
    otrosDatos: { modo: 'reprocess_carlos_local' },
  });
  let vlExtraction = toFullDocumentExtraction(informe, vlExtract.text, 0.92);
  vlExtraction = enrichVidaLaboralFromRawText(vlExtraction, 'vida_laboral');

  let basesExtraction = toFullDocumentExtraction(
    {
      ...emptyInforme(),
      documentType: 'bases_cotizacion',
      paginasProcesadas: basesExtract.totalPages,
      otrosDatos: { modo: 'reprocess_carlos_bases' },
    },
    basesExtract.text,
    0.92
  );
  basesExtraction = enrichBasesFromRawText(basesExtraction, 'bases_cotizacion');

  console.log(
    JSON.stringify(
      {
        vl: {
          nombre: vlExtraction.informeCompleto.identificacion.nombre,
          dias: vlExtraction.informeCompleto.resumen.totalDiasCotizacion,
          contratos: vlExtraction.informeCompleto.periodosContrato.length,
          autonomos: vlExtraction.informeCompleto.periodosAutonomo.length,
          asimiladas: vlExtraction.informeCompleto.situacionesAsimiladas.length,
          desempleo: vlExtraction.informeCompleto.prestacionesDesempleo.length,
          situacion: vlExtraction.informeCompleto.resumen.situacionActual,
          regimen: vlExtraction.informeCompleto.resumen.regimenPrincipal,
          openAlta: [
            ...vlExtraction.informeCompleto.periodosContrato,
            ...vlExtraction.informeCompleto.periodosAutonomo,
          ].filter((p) => !p.fechaBaja).length,
        },
        bases: vlExtraction.informeCompleto.basesCotizacion.length,
        basesMeses: basesExtraction.informeCompleto.basesCotizacion.length,
      },
      null,
      2
    )
  );

  const cases = await restGet<CaseRow[]>(
    url,
    key,
    'consultation_cases?select=id,founder_id,client_name,expediente_data&client_name=ilike.*Carlos*&order=updated_at.desc'
  );
  if (!cases.length) throw new Error('No hay consulta con nombre Carlos');

  const caseRow =
    cases.find((c) => /rodriguez|kobe/i.test(c.client_name)) ?? cases[0];
  console.log(`Consulta: ${caseRow.client_name} (${caseRow.id})`);

  const docs = await restGet<DocRow[]>(
    url,
    key,
    `documents?select=id,name,document_type,storage_path&consultation_case_id=eq.${caseRow.id}&order=created_at.desc`
  );

  const vlDoc = await upsertDoc(url, key, caseRow, docs, {
    match: (d) => /vida.?laboral/i.test(d.name) || d.document_type === 'vida_laboral',
    name: 'vida_laboral.pdf',
    documentType: 'vida_laboral',
    storageFile: 'vida_laboral-carlos.pdf',
    buf: vlBuf,
    extraction: vlExtraction,
  });

  const basesDoc = await upsertDoc(url, key, caseRow, docs, {
    match: (d) =>
      /bases/i.test(d.name) ||
      d.document_type === 'bases_cotizacion' ||
      d.document_type === 'bases',
    name: 'Informe Bases Cotización Online.pdf',
    documentType: 'bases_cotizacion',
    storageFile: 'bases-carlos.pdf',
    buf: basesBuf,
    extraction: basesExtraction,
  });

  let expediente: ExpedienteDigital =
    caseRow.expediente_data?.userId
      ? caseRow.expediente_data
      : emptyExpediente(caseRow.founder_id);

  expediente = stripDoc(expediente, vlDoc.id);
  expediente = stripDoc(expediente, basesDoc.id);

  const vlNorm = normalizeByDocumentType(
    vlExtraction,
    vlDoc.id,
    vlDoc.name || 'vida_laboral.pdf',
    'vida_laboral'
  );
  const basesNorm = normalizeByDocumentType(
    basesExtraction,
    basesDoc.id,
    basesDoc.name || 'bases.pdf',
    'bases_cotizacion'
  );

  expediente = mergeDocumentIntoExpediente(
    expediente,
    vlNorm,
    vlDoc.id,
    vlDoc.name || 'vida_laboral.pdf'
  );
  expediente = mergeDocumentIntoExpediente(
    expediente,
    basesNorm,
    basesDoc.id,
    basesDoc.name || 'bases.pdf'
  );
  expediente = applyCrossValidation(expediente);
  expediente = await finalizeExpediente(expediente, 'reprocess-carlos');

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
        periodos: expediente.periodos.length,
        prestaciones: expediente.prestaciones.length,
        bases: expediente.bases.length,
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
