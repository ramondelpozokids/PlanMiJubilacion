/**
 * Motor de validación SIP — opera solo sobre ExpedienteDigital.
 * Independiente del OCR y del motor de cálculo.
 */
export {
  crossValidateExpediente,
  applyCrossValidation,
} from '@/lib/expediente/cross-validate';
