/**
 * Solo pregunta al usuario lo que NO puede deducirse documentalmente.
 */
import type { ExpedienteDigital } from './types';

export interface PendingQuestion {
  id: string;
  field: string;
  question: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const DEDUCIBLE_FIELDS = [
  'nombre',
  'dni',
  'nie',
  'numeroAfiliacion',
  'fechaNacimiento',
  'edad',
  'anosCotizados',
  'regimenPrincipal',
  'empresaActual',
  'baseMensualActual',
] as const;

function hasValue(exp: ExpedienteDigital, field: (typeof DEDUCIBLE_FIELDS)[number]): boolean {
  switch (field) {
    case 'nombre':
      return Boolean(exp.identificacion.nombre?.value);
    case 'dni':
      return Boolean(exp.identificacion.dni?.value);
    case 'nie':
      return Boolean(exp.identificacion.nie?.value);
    case 'numeroAfiliacion':
      return Boolean(exp.identificacion.numeroAfiliacion?.value);
    case 'fechaNacimiento':
      return Boolean(exp.identificacion.fechaNacimiento?.value);
    case 'edad':
      return exp.identificacion.edad?.value != null;
    case 'anosCotizados':
      return exp.resumen.anosCotizados?.value != null;
    case 'regimenPrincipal':
      return Boolean(exp.resumen.regimenPrincipal?.value);
    case 'empresaActual':
      return Boolean(exp.resumen.empresaActual?.value);
    case 'baseMensualActual':
      return exp.resumen.baseMensualActual?.value != null;
    default:
      return false;
  }
}

export function derivePendingQuestions(expediente: ExpedienteDigital): PendingQuestion[] {
  const questions: PendingQuestion[] = [];

  if (!hasValue(expediente, 'fechaNacimiento') && !hasValue(expediente, 'edad')) {
    questions.push({
      id: 'fechaNacimiento',
      field: 'fechaNacimiento',
      question: '¿Cuál es tu fecha de nacimiento? (No aparece en los documentos subidos)',
      reason: 'Necesaria para calcular edad de jubilación',
      priority: 'high',
    });
  }

  if (!hasValue(expediente, 'anosCotizados') && expediente.periodos.length === 0) {
    questions.push({
      id: 'vida_laboral',
      field: 'documentos',
      question: 'Sube tu Informe de Vida Laboral de la Seguridad Social',
      reason: 'Sin vida laboral no podemos calcular tus años cotizados',
      priority: 'high',
    });
  }

  if (!hasValue(expediente, 'baseMensualActual') && expediente.bases.length === 0) {
    questions.push({
      id: 'bases',
      field: 'bases',
      question: 'Sube un informe de bases de cotización o una nómina reciente',
      reason: 'Necesitamos bases para estimar la pensión',
      priority: 'medium',
    });
  }

  const hasParoInDocs = expediente.prestaciones.some((p) =>
    /desempleo|paro/i.test(p.tipo?.value ?? '')
  );
  const hasParoGap = expediente.lagunas.length > 0;
  if (hasParoGap && !hasParoInDocs && expediente.documentIds.length > 0) {
    questions.push({
      id: 'paro_docs',
      field: 'prestacion_desempleo',
      question: '¿Tuviste periodos de paro? Si tienes resoluciones del SEPE, súbelas',
      reason: 'Hay lagunas que podrían corresponder a desempleo no justificado documentalmente',
      priority: 'low',
    });
  }

  if (
    expediente.discrepancies.filter((d) => d.severity === 'error' || d.severity === 'warning')
      .length > 0 &&
    !expediente.discrepancies.every((d) => d.resolved)
  ) {
    questions.push({
      id: 'discrepancies',
      field: 'discrepancies',
      question: 'Revisa las discrepancias detectadas entre tus documentos en Análisis',
      reason: 'Hay datos contradictorios que pueden afectar el cálculo',
      priority: 'medium',
    });
  }

  return questions;
}

export function attachPendingQuestions(expediente: ExpedienteDigital): ExpedienteDigital {
  return {
    ...expediente,
    pendingQuestions: derivePendingQuestions(expediente),
  };
}
