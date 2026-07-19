/**
 * Pagas anuales y neto orientativo tras IRPF (pensión contributiva SS).
 * 14 pagas = 12 mensuales + 2 extras.
 */

/** Pagas anuales de la pensión contributiva de jubilación (SS). */
export const PENSION_ANNUAL_PAYMENTS = 14;

/** Retención IRPF orientativa por defecto (15 %). */
export const DEFAULT_IRPF_RETENTION = 0.15;

/** Presets de retención IRPF (0–1) para UI. */
export const IRPF_RETENTION_PRESETS = [
  { label: '0 %', value: 0 },
  { label: '8 %', value: 0.08 },
  { label: '15 %', value: 0.15 },
  { label: '19 %', value: 0.19 },
  { label: '24 %', value: 0.24 },
] as const;

export interface PensionPayBreakdown {
  monthlyBruto: number;
  annualBruto: number;
  annualPayments: number;
  irpfRetention: number;
  irpfMonthly: number;
  netMonthly: number;
  netAnnual: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clampIrpfRetention(retention: number): number {
  return Math.min(0.5, Math.max(0, retention));
}

/** Bruto anual = mensual × 14 pagas. */
export function annualBrutoFromMonthly(monthly: number): number {
  return round2(monthly * PENSION_ANNUAL_PAYMENTS);
}

/**
 * Desglose bruto → IRPF → neto (orientativo).
 * `retention` es 0–1 (p. ej. 0.15 = 15 %).
 */
export function applyPensionIrpf(
  monthly: number | null,
  retention: number = DEFAULT_IRPF_RETENTION
): PensionPayBreakdown | null {
  if (monthly == null) return null;
  const irpfRetention = clampIrpfRetention(retention);
  const irpfMonthly = round2(monthly * irpfRetention);
  const netMonthly = round2(monthly - irpfMonthly);
  return {
    monthlyBruto: round2(monthly),
    annualBruto: annualBrutoFromMonthly(monthly),
    annualPayments: PENSION_ANNUAL_PAYMENTS,
    irpfRetention,
    irpfMonthly,
    netMonthly,
    netAnnual: round2(netMonthly * PENSION_ANNUAL_PAYMENTS),
  };
}

/** Etiqueta corta: «14 pagas (12 + 2 extras)». */
export function pensionPaymentsLabel(): string {
  return `${PENSION_ANNUAL_PAYMENTS} pagas (12 + 2 extras)`;
}
