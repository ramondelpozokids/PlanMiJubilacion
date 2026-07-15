/**
 * Motor de cruce de datos — detecta inconsistencias entre fuentes del expediente.
 * Fechas parseadas (no comparación de strings DD/MM/YYYY).
 */
import type { ExpedienteDigital, Discrepancy } from './types';
import { newId } from './types';
import {
  isLikelyLocationNotCompany,
  parseDmy,
  rangesOverlapDays,
} from './sanitize';

export function crossValidateExpediente(expediente: ExpedienteDigital): Discrepancy[] {
  const found: Discrepancy[] = [];
  const now = new Date().toISOString();

  const basesByPeriod = new Map<string, number[]>();
  for (const b of expediente.bases) {
    const period = b.periodo?.value;
    const base = b.base?.value;
    if (!period || base == null) continue;
    if (!basesByPeriod.has(period)) basesByPeriod.set(period, []);
    basesByPeriod.get(period)!.push(base);
  }

  for (const [period, values] of basesByPeriod) {
    const unique = [...new Set(values)];
    if (unique.length > 1) {
      found.push({
        id: newId(),
        field: `base.${period}`,
        severity: 'warning',
        message: `Bases de cotización distintas en el periodo ${period}`,
        values: unique.map((v) => ({
          value: String(v),
          documentId: '',
          documentName: 'varios',
        })),
        detectedAt: now,
        resolved: false,
      });
    }
  }

  const totalDiasResumen = expediente.resumen.totalDiasCotizacion?.value;
  const sumPeriodoDias = expediente.periodos.reduce(
    (acc, p) => acc + (p.diasCotizados?.value ?? 0),
    0
  );
  // Solo avisar si la diferencia es grande Y hay pocas prestaciones (solapes frecuentes en VL)
  if (
    totalDiasResumen &&
    sumPeriodoDias > 0 &&
    Math.abs(totalDiasResumen - sumPeriodoDias) > totalDiasResumen * 0.25
  ) {
    found.push({
      id: newId(),
      field: 'totalDiasCotizacion',
      severity: 'info',
      message:
        'La suma de días por periodos no coincide con el total del resumen (normal si hay solapes o asimiladas)',
      values: [
        { value: String(totalDiasResumen), documentId: '', documentName: 'resumen' },
        { value: String(sumPeriodoDias), documentId: '', documentName: 'periodos' },
      ],
      detectedAt: now,
      resolved: false,
    });
  }

  const empresasActuales = new Set(
    expediente.periodos
      .filter((p) => !p.fechaBaja?.value)
      .map((p) => p.empresa?.value?.toLowerCase())
      .filter((e): e is string => Boolean(e) && !isLikelyLocationNotCompany(e))
  );
  const empresaResumen = expediente.resumen.empresaActual?.value;
  if (
    empresaResumen &&
    !isLikelyLocationNotCompany(empresaResumen) &&
    empresasActuales.size > 0 &&
    !empresasActuales.has(empresaResumen.toLowerCase())
  ) {
    found.push({
      id: newId(),
      field: 'empresaActual',
      severity: 'warning',
      message: 'La empresa actual del resumen no coincide con periodos abiertos',
      values: [
        {
          value: empresaResumen,
          documentId: expediente.resumen.empresaActual!.sources[0]?.documentId ?? '',
          documentName: expediente.resumen.empresaActual!.sources[0]?.documentName ?? '',
        },
        {
          value: [...empresasActuales].join(', '),
          documentId: '',
          documentName: 'periodos abiertos',
        },
      ],
      detectedAt: now,
      resolved: false,
    });
  }

  // SEPE vs periodos laborales — solo solape calendario real ≥ 14 días
  for (const prest of expediente.prestaciones) {
    if (!/desempleo|paro/i.test(prest.tipo?.value ?? '')) continue;
    const pStart = parseDmy(prest.fechaInicio?.value);
    const pEnd = parseDmy(prest.fechaFin?.value) ?? pStart;
    if (!pStart || !pEnd) continue;

    for (const labour of expediente.periodos) {
      const lStart = parseDmy(labour.fechaAlta?.value);
      if (!lStart) continue;
      const lEnd = parseDmy(labour.fechaBaja?.value) ?? new Date();
      const days = rangesOverlapDays(pStart, pEnd, lStart, lEnd);
      if (days >= 14) {
        found.push({
          id: newId(),
          field: 'prestacion.periodo',
          severity: 'info',
          message: `Prestación paro (${prest.fechaInicio?.value}–${prest.fechaFin?.value ?? '…'}) solapa ${days} días con ${labour.empresa?.value ?? 'periodo laboral'}`,
          values: [
            {
              value: `${prest.fechaInicio?.value}–${prest.fechaFin?.value}`,
              documentId: prest.sources[0]?.documentId ?? '',
              documentName: prest.sources[0]?.documentName ?? 'SEPE',
            },
            {
              value: labour.empresa?.value ?? '?',
              documentId: labour.sources[0]?.documentId ?? '',
              documentName: labour.sources[0]?.documentName ?? 'vida laboral',
            },
          ],
          detectedAt: now,
          resolved: false,
        });
        break;
      }
    }
  }

  // Duplicados: misma empresa + fechas + misma categoría (general+autónomo el mismo mes no es error)
  const periodKeys = new Map<string, number>();
  for (const p of expediente.periodos) {
    const empresa = p.empresa?.value?.toLowerCase() ?? '';
    if (isLikelyLocationNotCompany(empresa)) continue;
    const key = `${empresa}|${p.fechaAlta?.value}|${p.fechaBaja?.value ?? 'open'}|${p.categoria}`;
    periodKeys.set(key, (periodKeys.get(key) ?? 0) + 1);
  }
  for (const [key, count] of periodKeys) {
    if (count > 1) {
      found.push({
        id: newId(),
        field: 'periodo.duplicado',
        severity: 'warning',
        message: `Periodo duplicado detectado: ${key.split('|').slice(0, 3).join(' ')}`,
        values: [{ value: String(count), documentId: '', documentName: 'cruce expediente' }],
        detectedAt: now,
        resolved: false,
      });
    }
  }

  return found;
}

export function applyCrossValidation(expediente: ExpedienteDigital): ExpedienteDigital {
  // Recalcula desde cero; limpia empresaActual si es una ciudad (p.ej. MADRID)
  if (
    expediente.resumen.empresaActual?.value &&
    isLikelyLocationNotCompany(expediente.resumen.empresaActual.value)
  ) {
    expediente.resumen.empresaActual = null;
  }
  for (const p of expediente.periodos) {
    if (p.empresa?.value && isLikelyLocationNotCompany(p.empresa.value)) {
      p.empresa = null;
    }
  }
  expediente.discrepancies = crossValidateExpediente(expediente);
  return expediente;
}
