/**
 * Completa periodos de vida laboral desde el texto del PDF (parser determinista).
 */
import { parseVidaLaboralFromText } from '@/lib/ai/parse-vida-laboral';
import { computeAge, cleanPersonName } from '@/lib/ai/parse-seg-social';
import type {
  FullDocumentExtraction,
  PeriodoLaboral,
  PrestacionDesempleo,
  VidaLaboralCompleta,
} from '@/lib/ai/vida-laboral-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

function countPeriodos(ic: VidaLaboralCompleta): number {
  return (
    ic.periodosContrato.length +
    ic.periodosAutonomo.length +
    ic.situacionesAsimiladas.length +
    ic.prestacionesDesempleo.length
  );
}

function periodKey(p: PeriodoLaboral): string {
  return [p.fechaAlta, p.fechaBaja, p.empresa, p.ccc, p.regimen].join('|').toLowerCase();
}

function mergePeriodLists(a: PeriodoLaboral[], b: PeriodoLaboral[]): PeriodoLaboral[] {
  const seen = new Set(a.map(periodKey));
  const out = [...a];
  for (const p of b) {
    const k = periodKey(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

function mergePrestaciones(
  a: PrestacionDesempleo[],
  b: PrestacionDesempleo[]
): PrestacionDesempleo[] {
  const key = (p: PrestacionDesempleo) =>
    [p.fechaInicio, p.fechaFin, p.tipo].join('|').toLowerCase();
  const seen = new Set(a.map(key));
  const out = [...a];
  for (const p of b) {
    const k = key(p);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

/**
 * Si el OCR/IA dejó pocos periodos, completa con el parser local del texto PDF.
 */
export function enrichVidaLaboralFromRawText(
  ocr: FullDocumentExtraction,
  documentType: DocumentTypeKey
): FullDocumentExtraction {
  const text = ocr.rawText?.trim() ?? '';
  if (!text) return ocr;

  const looksLikeVida =
    documentType === 'vida_laboral' ||
    /informe\s+de\s+vida\s+laboral|situaciones?\s+de\s+alta|datos\s+identificativos/i.test(
      text
    ) ||
    countPeriodos(ocr.informeCompleto) === 0;

  if (!looksLikeVida) return ocr;

  const parsed = parseVidaLaboralFromText(text, documentType);
  const parsedCount =
    parsed.periodosContrato.length +
    parsed.periodosAutonomo.length +
    parsed.situacionesAsimiladas.length +
    parsed.prestacionesDesempleo.length;

  if (
    parsedCount === 0 &&
    !parsed.identificacion.nombre &&
    parsed.resumen.totalDiasCotizacion == null
  ) {
    return ocr;
  }

  const existing = ocr.informeCompleto;
  const existingCount = countPeriodos(existing);
  // Unión siempre: evita perder periodos si OCR o parser traen subconjuntos distintos
  const periodosContrato = mergePeriodLists(
    existing.periodosContrato,
    parsed.periodosContrato
  );
  const periodosAutonomo = mergePeriodLists(
    existing.periodosAutonomo,
    parsed.periodosAutonomo
  );
  const situacionesAsimiladas = mergePeriodLists(
    existing.situacionesAsimiladas,
    parsed.situacionesAsimiladas
  );
  const prestacionesDesempleo = mergePrestaciones(
    existing.prestacionesDesempleo,
    parsed.prestacionesDesempleo
  );
  const preferParsedPeriodos = parsedCount >= existingCount;

  const fechaNac =
    parsed.identificacion.fechaNacimiento ?? existing.identificacion.fechaNacimiento;
  const nombre =
    cleanPersonName(parsed.identificacion.nombre) ?? existing.identificacion.nombre;

  const informe: VidaLaboralCompleta = {
    ...existing,
    identificacion: {
      ...existing.identificacion,
      nombre,
      dni: parsed.identificacion.dni ?? existing.identificacion.dni,
      numeroAfiliacion:
        parsed.identificacion.numeroAfiliacion ?? existing.identificacion.numeroAfiliacion,
      fechaNacimiento: fechaNac,
      edad: computeAge(fechaNac) ?? existing.identificacion.edad,
    },
    resumen: {
      ...existing.resumen,
      totalDiasCotizacion:
        parsed.resumen.totalDiasCotizacion ?? existing.resumen.totalDiasCotizacion,
      anosCotizados: parsed.resumen.anosCotizados ?? existing.resumen.anosCotizados,
      mesesCotizados: parsed.resumen.mesesCotizados ?? existing.resumen.mesesCotizados,
      diasRestantes: parsed.resumen.diasRestantes ?? existing.resumen.diasRestantes,
      regimenPrincipal: parsed.resumen.regimenPrincipal ?? existing.resumen.regimenPrincipal,
      situacionActual: parsed.resumen.situacionActual ?? existing.resumen.situacionActual,
      fechaInforme: parsed.resumen.fechaInforme ?? existing.resumen.fechaInforme,
      diasAltaTotal: parsed.resumen.diasAltaTotal ?? existing.resumen.diasAltaTotal,
      diasPluriempleo: parsed.resumen.diasPluriempleo ?? existing.resumen.diasPluriempleo,
    },
    periodosContrato,
    periodosAutonomo,
    situacionesAsimiladas,
    prestacionesDesempleo,
    totalPeriodosExtraidos:
      periodosContrato.length +
      periodosAutonomo.length +
      situacionesAsimiladas.length +
      prestacionesDesempleo.length,
    otrosDatos: {
      ...existing.otrosDatos,
      periodosDesdeTexto: parsedCount,
      periodosLayout: 'vida_laboral_tgss',
    },
  };

  const ultimo =
    informe.periodosContrato[informe.periodosContrato.length - 1] ??
    informe.periodosAutonomo[informe.periodosAutonomo.length - 1];

  const fieldBoost = preferParsedPeriodos && parsedCount > 0 ? 0.15 : 0;

  return {
    ...ocr,
    informeCompleto: informe,
    nombre: informe.identificacion.nombre ?? ocr.nombre,
    fechaNacimiento: informe.identificacion.fechaNacimiento ?? ocr.fechaNacimiento,
    edad: informe.identificacion.edad ?? ocr.edad,
    empresa: ultimo?.empresa ?? ocr.empresa,
    regimen: informe.resumen.regimenPrincipal ?? ocr.regimen,
    anosCotizados: informe.resumen.anosCotizados ?? ocr.anosCotizados,
    mesesCotizados: informe.resumen.mesesCotizados ?? ocr.mesesCotizados,
    actualmenteTrabajando:
      /alta/i.test(informe.resumen.situacionActual ?? '') || ocr.actualmenteTrabajando,
    esAutonomo:
      informe.resumen.regimenPrincipal === 'autonomos' ||
      informe.periodosAutonomo.length > 0 ||
      ocr.esAutonomo,
    confidence: Math.min(0.98, Math.max(ocr.confidence, 0.55 + fieldBoost)),
  };
}
