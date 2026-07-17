/**
 * Extracción COMPLETA de vida laboral / documentos Seguridad Social.
 * Lee todo el PDF (texto + visión por lotes) y devuelve todos los periodos, prestaciones, etc.
 */

import {
  parseSegSocialDocument,
  computeAge,
  cleanPersonName,
} from '@/lib/ai/parse-seg-social';
import {
  requireOpenAiApiKey,
  isOpenAiConfigured,
  getOpenAiStatus,
} from '@/lib/openai/env';
import { getExtractionPromptForType } from '@/lib/extractors/type-prompts';
import { normalizeDocumentType } from '@/lib/expediente/document-types';
export type {
  PeriodoLaboral,
  PrestacionDesempleo,
  DatosIdentificativos,
  ResumenCotizacion,
  BaseCotizacionMes,
  VidaLaboralCompleta,
  FullDocumentExtraction,
} from '@/lib/ai/vida-laboral-types';
export {
  isFullDocumentExtraction,
  countFullExtractionFields,
} from '@/lib/ai/vida-laboral-types';
import type {
  PeriodoLaboral,
  PrestacionDesempleo,
  DatosIdentificativos,
  ResumenCotizacion,
  BaseCotizacionMes,
  VidaLaboralCompleta,
  FullDocumentExtraction,
} from '@/lib/ai/vida-laboral-types';
import { countFullExtractionFields } from '@/lib/ai/vida-laboral-types';

const JSON_SCHEMA_PROMPT = `Devuelve UN objeto JSON con EXACTAMENTE esta estructura (todos los arrays; si no hay datos, array vacío):

{
  "identificacion": {
    "nombre": "string|null — SOLO apellidos y nombre",
    "dni": "string|null",
    "nie": "string|null",
    "numeroAfiliacion": "string|null — Nº afiliación SS",
    "fechaNacimiento": "DD/MM/YYYY|null",
    "edad": number|null,
    "direccion": "string|null — domicilio completo",
    "localidad": "string|null",
    "provincia": "string|null",
    "codigoPostal": "string|null"
  },
  "resumen": {
    "totalDiasCotizacion": number|null,
    "anosCotizados": number|null,
    "mesesCotizados": number|null,
    "diasRestantes": number|null,
    "regimenPrincipal": "general|autonomos|agrario|hogar|null",
    "situacionActual": "string|null",
    "fechaInforme": "DD/MM/YYYY|null"
  },
  "periodosContrato": [
    {
      "fechaAlta": "DD/MM/YYYY|null",
      "fechaBaja": "DD/MM/YYYY|null",
      "empresa": "string|null — razón social o nombre empleador",
      "ccc": "string|null — código cuenta cotización",
      "regimen": "string|null",
      "situacion": "ALTA|BAJA|string|null",
      "grupoCotizacion": "string|null",
      "diasCotizados": number|null,
      "tipo": "contrato"
    }
  ],
  "periodosAutonomo": [ /* misma estructura, tipo: "autonomo" — RETA, autónomos */ ],
  "prestacionesDesempleo": [
    {
      "tipo": "string|null — prestación, subsidio, etc.",
      "fechaInicio": "DD/MM/YYYY|null",
      "fechaFin": "DD/MM/YYYY|null",
      "dias": number|null,
      "situacion": "string|null",
      "observaciones": "string|null"
    }
  ],
  "situacionesAsimiladas": [ /* alta asimilada, servicios, etc. — misma estructura que periodos */ ],
  "lagunas": [{ "desde": "MM/YYYY|null", "hasta": "MM/YYYY|null", "dias": number|null }],
  "basesCotizacion": [{ "periodo": "MM/YYYY|null", "base": number|null, "regimen": "string|null" }],
  "otrosDatos": {}
}

REGLAS OBLIGATORIAS:
- Extrae CADA fila de CADA tabla del documento. NO resumas ni omitas periodos.
- Incluye TODAS las empresas con fechas de alta y baja.
- Incluye TODAS las prestaciones por desempleo/paro.
- Incluye TODOS los tramos como autónomo (RETA).
- Incluye situaciones asimiladas a la alta.
- NO inventes datos. null si no aparece.
- totalDiasCotizacion = total del RESUMEN (no periodos sueltos).`;

function emptyVidaLaboral(documentType: string): VidaLaboralCompleta {
  return {
    documentType,
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function periodoKey(p: PeriodoLaboral): string {
  return [p.fechaAlta, p.fechaBaja, p.empresa, p.ccc, p.regimen].join('|').toLowerCase();
}

function prestacionKey(p: PrestacionDesempleo): string {
  return [p.fechaInicio, p.fechaFin, p.tipo].join('|').toLowerCase();
}

export function mergeVidaLaboral(
  base: VidaLaboralCompleta,
  extra: Partial<VidaLaboralCompleta>
): VidaLaboralCompleta {
  const merged = { ...base };

  if (extra.identificacion) {
    merged.identificacion = {
      ...merged.identificacion,
      ...Object.fromEntries(
        Object.entries(extra.identificacion).filter(([, v]) => v != null && v !== '')
      ),
    } as DatosIdentificativos;
  }

  if (extra.resumen) {
    merged.resumen = {
      ...merged.resumen,
      ...Object.fromEntries(
        Object.entries(extra.resumen).filter(([, v]) => v != null && v !== '')
      ),
    } as ResumenCotizacion;
  }

  const mergePeriodos = (a: PeriodoLaboral[], b: PeriodoLaboral[]) => {
    const seen = new Set(a.map(periodoKey));
    for (const p of b) {
      const k = periodoKey(p);
      if (!seen.has(k)) {
        seen.add(k);
        a.push(p);
      }
    }
    return a;
  };

  merged.periodosContrato = mergePeriodos(
    [...merged.periodosContrato],
    extra.periodosContrato ?? []
  );
  merged.periodosAutonomo = mergePeriodos(
    [...merged.periodosAutonomo],
    extra.periodosAutonomo ?? []
  );
  merged.situacionesAsimiladas = mergePeriodos(
    [...merged.situacionesAsimiladas],
    extra.situacionesAsimiladas ?? []
  );

  const seenPrest = new Set(merged.prestacionesDesempleo.map(prestacionKey));
  for (const p of extra.prestacionesDesempleo ?? []) {
    const k = prestacionKey(p);
    if (!seenPrest.has(k)) {
      seenPrest.add(k);
      merged.prestacionesDesempleo.push(p);
    }
  }

  merged.lagunas = [...merged.lagunas, ...(extra.lagunas ?? [])];
  merged.basesCotizacion = [...merged.basesCotizacion, ...(extra.basesCotizacion ?? [])];
  merged.otrosDatos = { ...merged.otrosDatos, ...(extra.otrosDatos ?? {}) };

  merged.totalPeriodosExtraidos =
    merged.periodosContrato.length +
    merged.periodosAutonomo.length +
    merged.prestacionesDesempleo.length +
    merged.situacionesAsimiladas.length;

  return merged;
}

async function callOpenAIJson(
  userContent: string | Array<{ type: string; text?: string; image_url?: { url: string; detail?: string } }>,
  maxTokens = 16000
): Promise<Record<string, unknown>> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: requireOpenAiApiKey() });

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: maxTokens,
      messages: [
        {
          role: 'system',
          content: `Eres un extractor exhaustivo de documentos oficiales de la Seguridad Social española.
${JSON_SCHEMA_PROMPT}`,
        },
        { role: 'user', content: userContent as never },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('OpenAI no devolvió datos');
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number })?.status;
    if (
      status === 429 ||
      /429|quota|insufficient_quota|billing/i.test(msg)
    ) {
      throw new Error(
        'OPENAI_QUOTA: Has agotado la cuota de OpenAI (429). ' +
          'Añade crédito en https://platform.openai.com/settings/organization/billing'
      );
    }
    throw err;
  }
}

function isOpenAiQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('OPENAI_QUOTA') || /429|insufficient_quota/i.test(msg);
}

function parsePeriodo(raw: unknown, tipo: PeriodoLaboral['tipo']): PeriodoLaboral | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    fechaAlta: str(o.fechaAlta),
    fechaBaja: str(o.fechaBaja),
    empresa: str(o.empresa),
    ccc: str(o.ccc),
    regimen: str(o.regimen),
    situacion: str(o.situacion),
    grupoCotizacion: str(o.grupoCotizacion),
    diasCotizados: num(o.diasCotizados),
    tipo,
  };
}

function str(v: unknown): string | null {
  if (typeof v !== 'string' || !v.trim()) return null;
  return v.trim();
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseJsonToVidaLaboral(
  json: Record<string, unknown>,
  documentType: string
): VidaLaboralCompleta {
  const base = emptyVidaLaboral(documentType);
  const id = (json.identificacion as Record<string, unknown>) ?? {};
  const res = (json.resumen as Record<string, unknown>) ?? {};

  let anos = num(res.anosCotizados);
  let meses = num(res.mesesCotizados);
  const totalDias = num(res.totalDiasCotizacion);
  if (totalDias && anos == null) {
    anos = Math.floor(totalDias / 365.25);
    meses = Math.round((totalDias % 365.25) / 30.44);
  }

  const periodosContrato = Array.isArray(json.periodosContrato)
    ? json.periodosContrato
        .map((p) => parsePeriodo(p, 'contrato'))
        .filter((p): p is PeriodoLaboral => p != null)
    : [];

  const periodosAutonomo = Array.isArray(json.periodosAutonomo)
    ? json.periodosAutonomo
        .map((p) => parsePeriodo(p, 'autonomo'))
        .filter((p): p is PeriodoLaboral => p != null)
    : [];

  const situacionesAsimiladas = Array.isArray(json.situacionesAsimiladas)
    ? json.situacionesAsimiladas
        .map((p) => parsePeriodo(p, 'otro'))
        .filter((p): p is PeriodoLaboral => p != null)
    : [];

  const prestacionesDesempleo = Array.isArray(json.prestacionesDesempleo)
    ? json.prestacionesDesempleo
        .map((raw) => {
          if (!raw || typeof raw !== 'object') return null;
          const p = raw as Record<string, unknown>;
          return {
            tipo: str(p.tipo),
            fechaInicio: str(p.fechaInicio),
            fechaFin: str(p.fechaFin),
            dias: num(p.dias),
            situacion: str(p.situacion),
            observaciones: str(p.observaciones),
          };
        })
        .filter((p): p is PrestacionDesempleo => p != null)
    : [];

  const lagunas = Array.isArray(json.lagunas)
    ? json.lagunas.map((raw) => {
        const p = raw as Record<string, unknown>;
        return {
          desde: str(p.desde),
          hasta: str(p.hasta),
          dias: num(p.dias),
        };
      })
    : [];

  const basesCotizacion = Array.isArray(json.basesCotizacion)
    ? json.basesCotizacion.map((raw) => {
        const p = raw as Record<string, unknown>;
        return {
          periodo: str(p.periodo),
          base: num(p.base),
          regimen: str(p.regimen),
        };
      })
    : [];

  return mergeVidaLaboral(base, {
    identificacion: {
      nombre: str(id.nombre),
      dni: str(id.dni),
      nie: str(id.nie),
      numeroAfiliacion: str(id.numeroAfiliacion),
      fechaNacimiento: str(id.fechaNacimiento),
      edad: num(id.edad),
      direccion: str(id.direccion),
      localidad: str(id.localidad),
      provincia: str(id.provincia),
      codigoPostal: str(id.codigoPostal),
    },
    resumen: {
      totalDiasCotizacion: totalDias,
      anosCotizados: anos,
      mesesCotizados: meses,
      diasRestantes: num(res.diasRestantes),
      regimenPrincipal: str(res.regimenPrincipal),
      situacionActual: str(res.situacionActual),
      fechaInforme: str(res.fechaInforme),
    },
    periodosContrato,
    periodosAutonomo,
    prestacionesDesempleo,
    situacionesAsimiladas,
    lagunas,
    basesCotizacion,
    otrosDatos: (json.otrosDatos as Record<string, unknown>) ?? {},
  });
}

async function extractFromTextChunk(
  text: string,
  documentType: string,
  options: { includeIdentificacion: boolean; chunkLabel?: string }
): Promise<VidaLaboralCompleta> {
  const focus = options.includeIdentificacion
    ? 'Extrae identificación, resumen Y todos los periodos/prestaciones de este fragmento.'
    : `Fragmento ${options.chunkLabel ?? ''}: extrae SOLO periodosContrato, periodosAutonomo, prestacionesDesempleo, situacionesAsimiladas, lagunas y basesCotizacion de este fragmento. identificacion y resumen pueden ir vacíos/null.`;

  const typeHint = getExtractionPromptForType(normalizeDocumentType(documentType));
  const json = await callOpenAIJson(
    `${typeHint}\n\nTipo documento: ${documentType}\n${focus}\n\n--- TEXTO ---\n${text}`
  );
  return parseJsonToVidaLaboral(json, documentType);
}

async function extractFromVisionPages(
  pageUrls: string[],
  documentType: string,
  pageNums: number[]
): Promise<VidaLaboralCompleta> {
  const typeHint = getExtractionPromptForType(normalizeDocumentType(documentType));
  const json = await callOpenAIJson([
    {
      type: 'text',
      text: `${typeHint}\n\nTipo: ${documentType}. Páginas ${pageNums.join(', ')} del PDF.
Lee CADA fila de CADA tabla visible. Extrae todos los periodos laborales, autónomos, prestaciones de desempleo y situaciones asimiladas.`,
    },
    ...pageUrls.map((url) => ({
      type: 'image_url' as const,
      image_url: { url, detail: 'high' as const },
    })),
  ]);

  return parseJsonToVidaLaboral(json, documentType);
}

function splitTextBySize(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const nl = text.lastIndexOf('\n', end);
      if (nl > start + maxChars * 0.5) end = nl;
    }
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
}

export function toFullDocumentExtraction(
  informe: VidaLaboralCompleta,
  rawText: string,
  confidence: number
): FullDocumentExtraction {
  const { identificacion: id, resumen: res } = informe;
  const ultimoContrato = informe.periodosContrato[informe.periodosContrato.length - 1];
  const bases = informe.basesCotizacion.map((b) => b.base).filter((b): b is number => b != null);

  const lagunas = informe.lagunas
    .filter((l) => l.desde && l.hasta)
    .map((l) => ({
      desde: l.desde!,
      hasta: l.hasta!,
      meses: l.dias ? Math.round(l.dias / 30) : 0,
    }));

  return {
    informeCompleto: informe,
    rawText,
    confidence,
    nombre: id.nombre,
    fechaNacimiento: id.fechaNacimiento,
    edad: id.edad,
    empresa: ultimoContrato?.empresa ?? informe.periodosAutonomo.at(-1)?.empresa ?? null,
    regimen: res.regimenPrincipal,
    grupoCotizacion: ultimoContrato?.grupoCotizacion ?? null,
    salarioBruto: null,
    baseMensual: bases.at(-1) ?? null,
    basesUltimos24: bases.slice(-24),
    anosCotizados: res.anosCotizados,
    mesesCotizados: res.mesesCotizados,
    lagunas,
    actualmenteTrabajando: /alta/i.test(res.situacionActual ?? ''),
    esAutonomo: res.regimenPrincipal === 'autonomos' || informe.periodosAutonomo.length > 0,
  };
}

/** Sin OpenAI: solo texto del PDF (datos básicos, sin tablas completas). */
async function extractLocalFallbackFromPdf(
  fileBuffer: Buffer,
  documentType: string
): Promise<FullDocumentExtraction> {
  const { extractPdfText } = await import('@/lib/pdf/extract-text');
  const { text: rawText, totalPages } = await extractPdfText(fileBuffer);

  if (!rawText) {
    throw new Error(getOpenAiStatus().message);
  }

  const ss = parseSegSocialDocument(rawText);
  const informe = mergeVidaLaboral(emptyVidaLaboral(documentType), {
    identificacion: {
      nombre: cleanPersonName(ss.nombre),
      dni: ss.dni,
      nie: null,
      numeroAfiliacion: ss.naf,
      fechaNacimiento: ss.fechaNacimiento,
      edad: computeAge(ss.fechaNacimiento),
      direccion: null,
      localidad: null,
      provincia: null,
      codigoPostal: null,
    },
    resumen: {
      totalDiasCotizacion: ss.diasCotizados,
      anosCotizados: ss.anosCotizados,
      mesesCotizados: ss.mesesCotizados,
      diasRestantes: null,
      regimenPrincipal: ss.regimen,
      situacionActual: null,
      fechaInforme: null,
    },
    paginasProcesadas: totalPages,
    otrosDatos: {
      modo: 'local_sin_openai',
      aviso: getOpenAiStatus().message,
      textoExtraidoCaracteres: rawText.length,
    },
  });

  return toFullDocumentExtraction(informe, rawText, 0.35);
}

/** Lectura exhaustiva del PDF completo. */
export async function extractFullDocumentFromPdf(
  fileBuffer: Buffer,
  documentType: string
): Promise<FullDocumentExtraction> {
  if (!isOpenAiConfigured()) {
    return extractLocalFallbackFromPdf(fileBuffer, documentType);
  }

  try {
    return await extractFullDocumentFromPdfWithOpenAi(fileBuffer, documentType);
  } catch (err) {
    if (isOpenAiQuotaError(err)) {
      console.warn('OpenAI quota agotada — fallback local:', err);
      const local = await extractLocalFallbackFromPdf(fileBuffer, documentType);
      local.informeCompleto.otrosDatos = {
        ...local.informeCompleto.otrosDatos,
        modo: 'local_por_cuota_openai',
        aviso:
          'Cuota OpenAI agotada (429). Lectura parcial con parser local. Añade crédito en platform.openai.com/billing',
      };
      return local;
    }
    throw err;
  }
}

async function extractFullDocumentFromPdfWithOpenAi(
  fileBuffer: Buffer,
  documentType: string
): Promise<FullDocumentExtraction> {
  const { createPdfParser } = await import('@/lib/pdf/create-parser');
  const parser = await createPdfParser(fileBuffer);

  try {
    const textResult = await parser.getText();
    const rawText = textResult.text || '';
    const totalPages = textResult.total || 1;

    if (!rawText.trim() && totalPages === 0) {
      throw new Error('No se pudo leer el PDF.');
    }

    let informe = emptyVidaLaboral(documentType);
    informe.paginasProcesadas = totalPages;

    const textChunks = splitTextBySize(rawText, 45000);

    for (let i = 0; i < textChunks.length; i++) {
      const partial = await extractFromTextChunk(textChunks[i], documentType, {
        includeIdentificacion: i === 0,
        chunkLabel: `${i + 1}/${textChunks.length}`,
      });
      informe = mergeVidaLaboral(informe, partial);
    }

    // Visión en páginas — complementa el texto (mismo parser que el fundador)
    if (totalPages > 0) {
      const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
      for (const batch of chunk(allPages, 3)) {
        try {
          const shots = await parser.getScreenshot({ partial: batch, scale: 1.35 });
          const urls = shots.pages.map((p) => p.dataUrl).filter(Boolean);
          if (urls.length > 0) {
            const partial = await extractFromVisionPages(urls, documentType, batch);
            informe = mergeVidaLaboral(informe, partial);
          }
        } catch (err) {
          if (isOpenAiQuotaError(err)) throw err;
          console.warn('Vision batch failed pages', batch, err);
        }
      }
    }

    if (!rawText.trim() && informe.totalPeriodosExtraidos === 0) {
      throw new Error('No se pudo leer el PDF.');
    }

    informe.paginasProcesadas = totalPages;
    informe.totalPeriodosExtraidos =
      informe.periodosContrato.length +
      informe.periodosAutonomo.length +
      informe.prestacionesDesempleo.length +
      informe.situacionesAsimiladas.length;

    const fieldScore = countFullExtractionFields(
      toFullDocumentExtraction(informe, rawText, 0)
    );
    const confidence =
      fieldScore >= 10 ? 0.95 : fieldScore >= 5 ? 0.85 : fieldScore >= 2 ? 0.7 : 0.5;

    return toFullDocumentExtraction(informe, rawText, confidence);
  } finally {
    await parser.destroy();
  }
}

export async function extractFullDocumentFromImage(
  fileBuffer: Buffer,
  mimeType: string,
  documentType: string
): Promise<FullDocumentExtraction> {
  if (!isOpenAiConfigured()) {
    throw new Error(getOpenAiStatus().message);
  }

  const url = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
  const informe = await extractFromVisionPages([url], documentType, [1]);
  informe.paginasProcesadas = 1;
  return toFullDocumentExtraction(informe, '', 0.85);
}

