/**
 * Wizard de Asesoría gratuita
 * ---------------------------
 * UI en `components/features/asesoria-wizard/`.
 * Estado temporal: `lib/asesoria-wizard/storage.ts` (localStorage).
 * Cálculo: `lib/asesoria-wizard/simulate-at-date.ts` → motor SIP
 *   (`simulateScenario`, `buildRetirementOutlook`, `applyEarlyReduction`).
 * Persistencia expediente: `app/(app)/asesoria/wizard-actions.ts`.
 *
 * Pasos: personal → documents → international → retirement → summary → result.
 */
export { AsesoriaSimulationWizard } from './asesoria-simulation-wizard';
