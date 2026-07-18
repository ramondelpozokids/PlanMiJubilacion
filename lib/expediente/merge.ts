/**
 * Motor de merge — enriquece el expediente sin sobrescribir sin comprobar conflictos.
 */
import type { NormalizedDocumentPayload } from './normalize';
import type {
  Discrepancy,
  ExpedienteDigital,
  FieldProvenance,
  IdentificacionExpediente,
  SourcedValue,
} from './types';
import { attachIds } from './normalize';
import { newId } from './types';
import {
  isContributionMonthOnOrBeforeToday,
  filterPeriodToToday,
  parseDmy,
  endOfToday,
} from './sanitize';

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

/** En actualizaciones periódicas, el documento nuevo gana. */
function mergePreferIncoming<T>(
  existing: SourcedValue<T> | null,
  incoming: SourcedValue<T> | null
): SourcedValue<T> | null {
  if (!incoming) return existing;
  if (!existing) return incoming;
  if (valuesEqual(existing.value, incoming.value)) {
    const mergedSources = [...existing.sources];
    for (const s of incoming.sources) {
      if (!mergedSources.some((m) => m.documentId === s.documentId)) {
        mergedSources.push(s);
      }
    }
    return { value: incoming.value, sources: mergedSources };
  }
  return incoming;
}

function mergeSourcedScalar<T>(
  existing: SourcedValue<T> | null,
  incoming: SourcedValue<T> | null,
  field: string,
  documentId: string,
  documentName: string,
  discrepancies: Discrepancy[]
): SourcedValue<T> | null {
  if (!incoming) return existing;
  if (!existing) return incoming;

  if (valuesEqual(existing.value, incoming.value)) {
    const mergedSources = [...existing.sources];
    for (const s of incoming.sources) {
      if (!mergedSources.some((m) => m.documentId === s.documentId)) {
        mergedSources.push(s);
      }
    }
    return { value: existing.value, sources: mergedSources };
  }

  discrepancies.push({
    id: newId(),
    field,
    severity: 'warning',
    message: `Valor distinto para "${field}" entre documentos`,
    values: [
      { value: String(existing.value), documentId: existing.sources[0]?.documentId ?? '', documentName: existing.sources[0]?.documentName ?? '' },
      { value: String(incoming.value), documentId, documentName },
    ],
    detectedAt: new Date().toISOString(),
    resolved: false,
  });

  const existingConf = existing.sources[0]?.confidence ?? 0;
  const incomingConf = incoming.sources[0]?.confidence ?? 0;
  return incomingConf >= existingConf ? incoming : existing;
}

function documentTypePriority(documentType: string | undefined): number {
  switch (documentType) {
    case 'bases_cotizacion':
      return 4;
    case 'vida_laboral':
      return 3;
    case 'nomina':
      return 2;
    case 'simulacion_jubilacion':
      return 0;
    default:
      return 1;
  }
}

function maxSourcePriority(sources: FieldProvenance[]): number {
  return sources.reduce((max, s) => Math.max(max, documentTypePriority(s.documentType)), 0);
}

function mergeIdentificacion(
  exp: ExpedienteDigital,
  payload: NormalizedDocumentPayload,
  documentId: string,
  documentName: string,
  source: FieldProvenance
) {
  const id = payload.identificacion;
  const d = exp.discrepancies;

  // Mi plan del fundador: no dejar que un PDF de familiar (p. ej. Carlos) pise identidad.
  const lockedFounder =
    typeof exp.identificacion.nombre?.value === 'string' &&
    /ram[oó]n/i.test(exp.identificacion.nombre.value) &&
    /del\s*pozo/i.test(exp.identificacion.nombre.value);

  const set = (key: keyof IdentificacionExpediente, val: string | number | null | undefined) => {
    if (val == null) return;
    if (
      lockedFounder &&
      (key === 'nombre' ||
        key === 'dni' ||
        key === 'nie' ||
        key === 'fechaNacimiento' ||
        key === 'edad' ||
        key === 'numeroAfiliacion')
    ) {
      return;
    }
    const incoming = { value: val, sources: [source] } as SourcedValue<string | number>;
    const merged = mergeSourcedScalar(
      exp.identificacion[key] as SourcedValue<string | number> | null,
      incoming,
      key,
      documentId,
      documentName,
      d
    );
    (exp.identificacion as Record<
      keyof IdentificacionExpediente,
      SourcedValue<string | number> | null
    >)[key] = merged;
  };

  set('nombre', id.nombre as string);
  set('dni', id.dni as string);
  set('nie', id.nie as string);
  set('numeroAfiliacion', id.numeroAfiliacion as string);
  set('fechaNacimiento', id.fechaNacimiento as string);
  set('edad', id.edad as number);
  set('direccion', id.direccion as string);
  set('localidad', id.localidad as string);
  set('provincia', id.provincia as string);
  set('codigoPostal', id.codigoPostal as string);
}

function periodoFingerprint(p: {
  fechaAlta?: SourcedValue<string> | null;
  empresa?: SourcedValue<string> | null;
  ccc?: SourcedValue<string> | null;
}): string {
  return [
    p.fechaAlta?.value ?? '',
    p.empresa?.value ?? '',
    p.ccc?.value ?? '',
  ]
    .join('|')
    .toLowerCase();
}

export function mergeDocumentIntoExpediente(
  expediente: ExpedienteDigital,
  payload: NormalizedDocumentPayload,
  documentId: string,
  documentName: string
): ExpedienteDigital {
  const source: FieldProvenance = {
    documentId,
    documentName,
    documentType: payload.documentType,
    extractedAt: new Date().toISOString(),
    confidence: payload.confidence,
  };

  mergeIdentificacion(expediente, payload, documentId, documentName, source);

  const res = payload.resumen;
  const isRefresh =
    payload.documentType === 'vida_laboral' ||
    payload.documentType === 'bases_cotizacion';

  if (isRefresh) {
    expediente.resumen.totalDiasCotizacion = mergePreferIncoming(
      expediente.resumen.totalDiasCotizacion,
      res.totalDiasCotizacion != null
        ? { value: Number(res.totalDiasCotizacion), sources: [source] }
        : null
    );
    expediente.resumen.anosCotizados = mergePreferIncoming(
      expediente.resumen.anosCotizados,
      res.anosCotizados != null ? { value: Number(res.anosCotizados), sources: [source] } : null
    );
    expediente.resumen.mesesCotizados = mergePreferIncoming(
      expediente.resumen.mesesCotizados,
      res.mesesCotizados != null ? { value: Number(res.mesesCotizados), sources: [source] } : null
    );
    expediente.resumen.regimenPrincipal = mergePreferIncoming(
      expediente.resumen.regimenPrincipal,
      res.regimenPrincipal ? { value: String(res.regimenPrincipal), sources: [source] } : null
    );
    expediente.resumen.situacionActual = mergePreferIncoming(
      expediente.resumen.situacionActual,
      res.situacionActual ? { value: String(res.situacionActual), sources: [source] } : null
    );
    expediente.resumen.empresaActual = mergePreferIncoming(
      expediente.resumen.empresaActual,
      res.empresaActual ? { value: String(res.empresaActual), sources: [source] } : null
    );
    expediente.resumen.baseMensualActual = mergePreferIncoming(
      expediente.resumen.baseMensualActual,
      res.baseMensualActual != null
        ? { value: Number(res.baseMensualActual), sources: [source] }
        : null
    );
  } else {
    expediente.resumen.totalDiasCotizacion = mergeSourcedScalar(
      expediente.resumen.totalDiasCotizacion,
      res.totalDiasCotizacion != null
        ? { value: Number(res.totalDiasCotizacion), sources: [source] }
        : null,
      'totalDiasCotizacion',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.anosCotizados = mergeSourcedScalar(
      expediente.resumen.anosCotizados,
      res.anosCotizados != null ? { value: Number(res.anosCotizados), sources: [source] } : null,
      'anosCotizados',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.mesesCotizados = mergeSourcedScalar(
      expediente.resumen.mesesCotizados,
      res.mesesCotizados != null ? { value: Number(res.mesesCotizados), sources: [source] } : null,
      'mesesCotizados',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.regimenPrincipal = mergeSourcedScalar(
      expediente.resumen.regimenPrincipal,
      res.regimenPrincipal ? { value: String(res.regimenPrincipal), sources: [source] } : null,
      'regimenPrincipal',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.situacionActual = mergeSourcedScalar(
      expediente.resumen.situacionActual,
      res.situacionActual ? { value: String(res.situacionActual), sources: [source] } : null,
      'situacionActual',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.empresaActual = mergeSourcedScalar(
      expediente.resumen.empresaActual,
      res.empresaActual ? { value: String(res.empresaActual), sources: [source] } : null,
      'empresaActual',
      documentId,
      documentName,
      expediente.discrepancies
    );
    expediente.resumen.baseMensualActual = mergeSourcedScalar(
      expediente.resumen.baseMensualActual,
      res.baseMensualActual != null
        ? { value: Number(res.baseMensualActual), sources: [source] }
        : null,
      'baseMensualActual',
      documentId,
      documentName,
      expediente.discrepancies
    );
  }

  const withIds = attachIds(payload, documentId, documentName, payload.documentType);

  for (const p of withIds.periodos) {
    const fp = periodoFingerprint(p);
    const idx = expediente.periodos.findIndex((e) => periodoFingerprint(e) === fp);
    if (idx === -1) expediente.periodos.push(p);
    else if (isRefresh) {
      expediente.periodos[idx] = {
        ...expediente.periodos[idx],
        ...p,
        id: expediente.periodos[idx].id,
        sources: [...expediente.periodos[idx].sources, ...p.sources],
      };
    }
  }

  for (const p of withIds.prestaciones) {
    const fp = `${p.fechaInicio?.value}|${p.tipo?.value}`.toLowerCase();
    const idx = expediente.prestaciones.findIndex(
      (e) => `${e.fechaInicio?.value}|${e.tipo?.value}`.toLowerCase() === fp
    );
    if (idx === -1) expediente.prestaciones.push(p);
    else if (isRefresh) {
      expediente.prestaciones[idx] = {
        ...expediente.prestaciones[idx],
        ...p,
        id: expediente.prestaciones[idx].id,
        sources: [...expediente.prestaciones[idx].sources, ...p.sources],
      };
    }
  }

  for (const b of withIds.bases) {
    const periodKey = (b.periodo?.value ?? '').toLowerCase();
    const idx = expediente.bases.findIndex(
      (e) => (e.periodo?.value ?? '').toLowerCase() === periodKey && periodKey !== ''
    );
    const incomingPriority = documentTypePriority(payload.documentType);
    if (idx === -1) {
      if (incomingPriority > 0) expediente.bases.push(b);
      continue;
    }
    const existing = expediente.bases[idx];
    const existingPriority = maxSourcePriority(existing.sources);
    if (incomingPriority >= existingPriority) {
      expediente.bases[idx] = {
        ...b,
        id: existing.id,
        sources: [...existing.sources, ...b.sources],
      };
    } else {
      expediente.bases[idx] = {
        ...existing,
        sources: [...existing.sources, ...b.sources],
      };
    }
  }

  expediente.resoluciones.push(...withIds.resoluciones);

  if (!expediente.documentIds.includes(documentId)) {
    expediente.documentIds.push(documentId);
  }

  pruneExpedienteToToday(expediente);

  expediente.updatedAt = new Date().toISOString();
  expediente.completitud = computeCompletitud(expediente);

  return expediente;
}

/** Quita bases que solo vienen de la simulación SS (no son cotización real). */
export function stripSimulationOnlyBases(expediente: ExpedienteDigital): void {
  expediente.bases = expediente.bases.filter((b) => {
    const types = b.sources.map((s) => s.documentType);
    if (types.length === 0) return true;
    return types.some((t) => t && t !== 'simulacion_jubilacion');
  });
}

/** Deja el expediente anclado al presente real (sin proyecciones futuras). */
export function pruneExpedienteToToday(expediente: ExpedienteDigital): void {
  stripSimulationOnlyBases(expediente);
  expediente.bases = expediente.bases.filter((b) =>
    isContributionMonthOnOrBeforeToday(b.periodo?.value ?? null)
  );
  expediente.periodos = expediente.periodos
    .map((p) => filterPeriodToToday(p))
    .filter((p): p is NonNullable<typeof p> => p != null);
  expediente.prestaciones = expediente.prestaciones.filter((p) => {
    const ini = parseDmy(p.fechaInicio?.value ?? null);
    return !(ini && ini.getTime() > endOfToday().getTime());
  });
}

export function computeCompletitud(exp: ExpedienteDigital): ExpedienteDigital['completitud'] {
  const missing: string[] = [];
  if (!exp.identificacion.nombre) missing.push('nombre');
  if (!exp.identificacion.numeroAfiliacion) missing.push('numeroAfiliacion');
  if (!exp.resumen.anosCotizados) missing.push('anosCotizados');
  if (!exp.documentIds.length) missing.push('documentos');
  const hasVidaLaboral = exp.periodos.length > 0 || exp.resumen.totalDiasCotizacion;
  if (!hasVidaLaboral) missing.push('vida_laboral');

  let score = 0;
  if (exp.identificacion.nombre) score += 15;
  if (exp.identificacion.numeroAfiliacion) score += 15;
  if (exp.identificacion.dni || exp.identificacion.nie) score += 10;
  if (exp.resumen.anosCotizados) score += 20;
  if (exp.periodos.length) score += Math.min(25, exp.periodos.length * 2);
  if (exp.prestaciones.length) score += 10;
  if (exp.bases.length) score += 5;

  return {
    score: Math.min(100, score),
    documentosProcesados: exp.documentIds.length,
    camposCriticosFaltantes: missing,
  };
}

export function removeDocumentFromExpediente(
  expediente: ExpedienteDigital,
  documentId: string
): ExpedienteDigital {
  expediente.documentIds = expediente.documentIds.filter((id) => id !== documentId);
  expediente.periodos = expediente.periodos.filter(
    (p) => !p.sources.every((s) => s.documentId === documentId)
  );
  expediente.prestaciones = expediente.prestaciones.filter(
    (p) => !p.sources.every((s) => s.documentId === documentId)
  );
  expediente.bases = expediente.bases.filter(
    (b) => !b.sources.every((s) => s.documentId === documentId)
  );
  expediente.resoluciones = expediente.resoluciones.filter(
    (r) => !r.sources.every((s) => s.documentId === documentId)
  );
  expediente.lagunas = expediente.lagunas.filter(
    (l) => !l.sources.every((s) => s.documentId === documentId)
  );
  expediente.discrepancies = expediente.discrepancies.filter(
    (d) => !d.values.some((v) => v.documentId === documentId)
  );
  expediente.completitud = computeCompletitud(expediente);
  expediente.updatedAt = new Date().toISOString();
  return expediente;
}
