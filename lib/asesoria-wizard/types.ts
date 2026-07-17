/**
 * Wizard Asesoría Gratuita — tipos de dominio (UI).
 * El cálculo vive en lib/calculator/*; aquí solo estado de experiencia.
 */

export const WIZARD_STEPS = [
  { id: 'personal', label: 'Datos personales', short: '1. Datos' },
  { id: 'documents', label: 'Documentación', short: '2. Docs' },
  { id: 'international', label: 'Extranjero', short: '3. Exterior' },
  { id: 'retirement', label: 'Fecha de jubilación', short: '4. Fecha' },
  { id: 'summary', label: 'Resumen', short: '5. Resumen' },
  { id: 'result', label: 'Simulación', short: '6. Resultado' },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]['id'];

export type WizardDocKind = 'vida_laboral' | 'bases_cotizacion' | 'nomina';

export interface WizardUploadedDoc {
  id: string;
  kind: WizardDocKind;
  name: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  message?: string;
}

export interface WizardForeignPeriodDraft {
  id: string;
  countryCode: string;
  countryName: string;
  start: string; // YYYY-MM
  end: string;
  years: number | null;
  months: number | null;
  notes: string;
}

export interface WizardDraftState {
  version: 1;
  step: WizardStepId;
  birthDate: string; // YYYY-MM-DD
  hasWorkedAbroad: boolean | null;
  foreignPeriods: WizardForeignPeriodDraft[];
  retirementDate: string; // YYYY-MM-DD
  uploadedDocs: WizardUploadedDoc[];
  updatedAt: string;
}

export const WIZARD_STORAGE_KEY = 'planmi_asesoria_wizard_v1';

export function emptyWizardDraft(): WizardDraftState {
  return {
    version: 1,
    step: 'personal',
    birthDate: '',
    hasWorkedAbroad: null,
    foreignPeriods: [],
    retirementDate: '',
    uploadedDocs: [],
    updatedAt: new Date().toISOString(),
  };
}
