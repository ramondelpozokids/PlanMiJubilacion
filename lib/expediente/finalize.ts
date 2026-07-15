/**
 * Post-procesado DOCUMENTAL del expediente.
 * Preguntas pendientes + asesor documental.
 * NO calcula pensión. NO escribe extracted_data. NO toca scenarios.
 * El cálculo corre en lib/calculator/recalculate.ts
 */
import type { ExpedienteDigital } from './types';
import { attachPendingQuestions } from './pending-questions';
import { enrichExpedienteWithAdvisor } from './advisor';

export async function finalizeExpediente(
  expediente: ExpedienteDigital,
  _lastSource?: string
): Promise<ExpedienteDigital> {
  let exp = attachPendingQuestions(expediente);
  exp = enrichExpedienteWithAdvisor(exp);
  exp.updatedAt = new Date().toISOString();
  return exp;
}
