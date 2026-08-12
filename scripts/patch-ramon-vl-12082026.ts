/**
 * Actualiza VL + bases de Ramón (12/08/2026) y muestra faltante hasta ordinaria.
 * Uso: npx tsx scripts/patch-ramon-vl-12082026.ts
 */
import fs from 'fs';
import path from 'path';
import { extractPdfText } from '../lib/pdf/extract-text';
import { toFullDocumentExtraction, mergeVidaLaboral } from '../lib/ai/vida-laboral-full';
import type { VidaLaboralCompleta } from '../lib/ai/vida-laboral-types';
import { enrichBasesFromRawText } from '../lib/ocr/enrich-bases';
import { normalizeByDocumentType } from '../lib/expediente/normalize';
import { mergeDocumentIntoExpediente } from '../lib/expediente/merge';
import { applyCrossValidation } from '../lib/validation';
import { finalizeExpediente } from '../lib/expediente/finalize';
import { emptyExpediente, type ExpedienteDigital } from '../lib/expediente/types';
import { applyFounderIdentity } from '../lib/admin/founder-identity';
import { FOUNDER_LIFE_PATH } from '../lib/calculator/life-path';
import { buildRetirementOutlook } from '../lib/calculator/retirement-outlook';
import { resolveExpedienteAsOf } from '../lib/expediente/as-of';

const VL_PATH = 'C:/Users/X/Desktop/vida_laboral.pdf';
const BASES_PATH = 'C:/Users/X/Desktop/Informe Bases Cotización Online.pdf';
const UID = 'f0c66115-d1d3-489e-9a5f-fee6989f6a0c';

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

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function emptyInforme(): VidaLaboralCompleta {
  return {
    documentType: 'bases_cotizacion',
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

const SOURCE = {
  documentId: 'vl-12082026-patch',
  documentName: 'vida_laboral.pdf (12/08/2026)',
  documentType: 'vida_laboral' as const,
  extractedAt: new Date().toISOString(),
  confidence: 1,
};

function sv<T>(value: T) {
  return { value, sources: [SOURCE] };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const h = headers(key);

  if (!fs.existsSync(BASES_PATH)) throw new Error(`No existe ${BASES_PATH}`);

  const rows = await (
    await fetch(`${url}/rest/v1/expedientes?select=data&user_id=eq.${UID}`, { headers: h })
  ).json();
  let exp: ExpedienteDigital = rows[0]?.data?.userId ? rows[0].data : emptyExpediente(UID);

  // Totales VL autoritativos TGSS 12/08/2026
  exp.resumen.fechaInforme = sv('12/08/2026');
  exp.resumen.anosCotizados = sv(33);
  exp.resumen.mesesCotizados = sv(7);
  exp.resumen.diasRestantes = sv(25);
  exp.resumen.totalDiasCotizacion = sv(12290);
  exp.resumen.diasAltaTotal = sv(12612);
  exp.resumen.diasPluriempleo = sv(322);

  // Bases
  const basesBuf = fs.readFileSync(BASES_PATH);
  const basesExtract = await extractPdfText(basesBuf);
  let basesExtraction = toFullDocumentExtraction(
    mergeVidaLaboral(emptyInforme(), {
      documentType: 'bases_cotizacion',
      paginasProcesadas: basesExtract.totalPages,
      otrosDatos: { modo: 'patch_ramon_bases_12082026' },
    }),
    basesExtract.text,
    0.95
  );
  basesExtraction = enrichBasesFromRawText(basesExtraction, 'bases_cotizacion');

  const docs = await (
    await fetch(
      `${url}/rest/v1/documents?select=id,name,document_type&user_id=eq.${UID}&consultation_case_id=is.null&order=created_at.desc`,
      { headers: h }
    )
  ).json();

  let basesDoc =
    docs.find(
      (d: { name: string; document_type: string }) =>
        /bases/i.test(d.name) ||
        d.document_type === 'bases_cotizacion' ||
        d.document_type === 'bases'
    ) ?? null;

  if (!basesDoc) {
    const storagePath = `${UID}/bases-ramon-12082026.pdf`;
    await fetch(`${url}/storage/v1/object/documents/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'true',
      },
      body: new Uint8Array(basesBuf),
    });
    const created = await (
      await fetch(`${url}/rest/v1/documents`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({
          user_id: UID,
          name: 'Informe Bases Cotización Online.pdf',
          mime_type: 'application/pdf',
          size_bytes: basesBuf.length,
          storage_path: storagePath,
          document_type: 'bases_cotizacion',
          ocr_status: 'completed',
          ocr_data: basesExtraction,
          ocr_confidence: 0.95,
        }),
      })
    ).json();
    basesDoc = Array.isArray(created) ? created[0] : created;
  } else {
    await fetch(`${url}/rest/v1/documents?id=eq.${basesDoc.id}`, {
      method: 'PATCH',
      headers: h,
      body: JSON.stringify({
        ocr_status: 'completed',
        ocr_error: null,
        ocr_data: basesExtraction,
        ocr_confidence: 0.95,
        document_type: 'bases_cotizacion',
        name: 'Informe Bases Cotización Online.pdf',
      }),
    });
  }

  exp = {
    ...exp,
    bases: (exp.bases ?? []).filter(
      (b) => !b.sources?.some((s) => s.documentId === basesDoc!.id)
    ),
  };

  const basesNorm = normalizeByDocumentType(
    basesExtraction,
    basesDoc.id,
    basesDoc.name || 'bases.pdf',
    'bases_cotizacion'
  );
  exp = mergeDocumentIntoExpediente(
    exp,
    basesNorm,
    basesDoc.id,
    basesDoc.name || 'bases.pdf'
  );

  // Reafirmar totales VL (el merge de bases no debe pisarlos)
  exp.resumen.fechaInforme = sv('12/08/2026');
  exp.resumen.anosCotizados = sv(33);
  exp.resumen.mesesCotizados = sv(7);
  exp.resumen.diasRestantes = sv(25);
  exp.resumen.totalDiasCotizacion = sv(12290);
  exp.resumen.diasAltaTotal = sv(12612);
  exp.resumen.diasPluriempleo = sv(322);

  applyFounderIdentity(exp);
  exp = applyCrossValidation(exp);
  exp = await finalizeExpediente(exp, 'patch-ramon-12082026');
  exp.updatedAt = new Date().toISOString();

  const patch = await fetch(`${url}/rest/v1/expedientes?user_id=eq.${UID}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      data: exp,
      completitud_score: exp.completitud?.score ?? 100,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!patch.ok) throw new Error(await patch.text());

  const asOf = resolveExpedienteAsOf(exp);
  const outlook = buildRetirementOutlook(exp, asOf, FOUNDER_LIFE_PATH);

  console.log(
    JSON.stringify(
      {
        ok: true,
        asOf: '12/08/2026',
        carrera: outlook?.carreraLabel,
        diasComputables: 12290,
        diasAlta: 12612,
        pluriempleo: 322,
        basesMeses: basesExtraction.informeCompleto.basesCotizacion.length,
        basesExpediente: exp.bases.length,
        missingForAge65: outlook?.ordinary.missingForAge65Label,
        careerComplete: outlook?.ordinary.careerCompleteDateLabel,
        ordinaryDate: outlook?.ordinary.dateLabel,
        ordinaryAge: outlook?.ordinary.ageLabel,
        at65IfCareer: outlook?.ordinary.at65IfCareer,
        explanation: outlook?.ordinary.explanation,
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
