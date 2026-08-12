/**
 * Estimación del tipo de retención IRPF (algoritmo AEAT 2026, simplificado).
 * Fuente: ALGORITMO_2026 — TABLA 2 + mínimos + reducción pensionista.
 * Orientativo: no sustituye el Servicio de Cálculo de Retenciones AEAT.
 */

export interface AeatIrpfAssumptions {
  /** Edad del perceptor en el año de la pensión */
  ageYears: number;
  /** Situación familiar AEAT: 1 monoparental, 2 casado, 3 resto */
  familySituation?: 1 | 2 | 3;
  /** Nº de descendientes que dan derecho a mínimo */
  dependents?: number;
  /** true = perceptor pensionista SS / clases pasivas */
  pensioner?: boolean;
}

export interface AeatIrpfEstimate {
  /** Tipo de retención 0–1 (p. ej. 0.1817 = 18,17 %) */
  retention: number;
  /** Tipo en % truncado a 2 decimales (como AEAT) */
  retentionPercent: number;
  annualGross: number;
  annualIrpf: number;
  base: number;
  minPersonalFamiliar: number;
  cuota: number;
  explanation: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Truncar a 2 decimales (AEAT TRUNCAR). */
function trunc2(n: number): number {
  return Math.trunc(n * 100) / 100;
}

/** TABLA 2 — escala de retención AEAT 2026. */
export function aeatEscalaRetencion(base: number): number {
  if (base <= 0) return 0;
  if (base <= 12_450) return round2(base * 0.19);
  if (base <= 20_200) return round2(2_365.5 + (base - 12_450) * 0.24);
  if (base <= 35_200) return round2(4_225.5 + (base - 20_200) * 0.3);
  if (base <= 60_000) return round2(8_725.5 + (base - 35_200) * 0.37);
  if (base <= 300_000) return round2(17_901.5 + (base - 60_000) * 0.45);
  return round2(125_901.5 + (base - 300_000) * 0.47);
}

function reductionArt20(rnt: number): number {
  if (rnt <= 14_852) return 7_302;
  if (rnt <= 17_673.52) return round2(7_302 - 1.75 * (rnt - 14_852));
  if (rnt < 19_747.5) return round2(2_364.34 - 1.14 * (rnt - 17_673.52));
  return 0;
}

function minPersonalFamiliar(ageYears: number, dependents: number): number {
  let min = 5_550;
  if (ageYears >= 65) min += 1_150;
  if (ageYears >= 75) min += 1_400;
  // Mínimos por descendientes (enteros, simplificado: 1º 2400, 2º 2700, 3º 4000, 4º+ 4500)
  const childMins = [2_400, 2_700, 4_000, 4_500];
  for (let i = 0; i < dependents; i++) {
    min += childMins[Math.min(i, childMins.length - 1)]!;
  }
  return min;
}

function exemptionLimit(
  familySituation: 1 | 2 | 3,
  dependents: number,
  pensionReduction: number
): number {
  const p = pensionReduction;
  if (familySituation === 1) {
    if (dependents === 1) return 17_644 + p;
    if (dependents > 1) return 18_694 + p;
    return 0;
  }
  if (familySituation === 2) {
    if (dependents === 0) return 17_197 + p;
    if (dependents === 1) return 18_130 + p;
    return 19_262 + p;
  }
  // situación 3
  if (dependents === 0) return 15_876 + p;
  if (dependents === 1) return 16_342 + p;
  return 16_867 + p;
}

/**
 * Tipo de retención estimado para una pensión bruta anual (14 pagas).
 * Hipótesis por defecto: soltero (sit. 3), sin hijos, pensionista SS, sin discapacidad.
 */
export function estimateAeatPensionIrpf(
  annualGross: number,
  assumptions: AeatIrpfAssumptions = { ageYears: 65 }
): AeatIrpfEstimate | null {
  if (!Number.isFinite(annualGross) || annualGross <= 0) return null;

  const ageYears = assumptions.ageYears ?? 65;
  const familySituation = assumptions.familySituation ?? 3;
  const dependents = Math.max(0, assumptions.dependents ?? 0);
  const pensioner = assumptions.pensioner !== false;

  const retrib = round2(annualGross);
  const rnt = retrib; // sin cotizaciones SS en pensión
  const red20 = reductionArt20(rnt);
  const otrosGastos = Math.min(2_000, retrib);
  const rntRedu = Math.max(0, round2(rnt - otrosGastos - red20));
  const pensionReduction = pensioner ? 600 : 0;
  const childrenReduction = dependents > 2 ? 600 : 0;
  const redu = pensionReduction + childrenReduction;
  const base = Math.max(0, round2(rntRedu - redu));
  const minPerFa = minPersonalFamiliar(ageYears, dependents);

  const exemptLimit = exemptionLimit(familySituation, dependents, pensionReduction);
  if (exemptLimit > 0 && retrib <= exemptLimit) {
    return {
      retention: 0,
      retentionPercent: 0,
      annualGross: retrib,
      annualIrpf: 0,
      base,
      minPersonalFamiliar: minPerFa,
      cuota: 0,
      explanation: `Exento de retención (retribuciones ≤ ${exemptLimit.toLocaleString('es-ES')} €).`,
    };
  }

  const cuota1 = aeatEscalaRetencion(base);
  const cuota2 = aeatEscalaRetencion(minPerFa);
  let cuota = Math.max(0, round2(cuota1 - cuota2));

  // Límite 43 % art. 85.3 RIRPF (simplificado situación 3 / sin hijos)
  if (retrib < 35_200) {
    const floor =
      familySituation === 3 && dependents === 0
        ? 15_876 + pensionReduction
        : familySituation === 2 && dependents === 0
          ? 17_197 + pensionReduction
          : null;
    if (floor != null) {
      const limite = Math.max(0, (retrib - floor) * 0.43);
      if (cuota > limite) cuota = round2(limite);
    }
  }

  const retentionPercent = trunc2((cuota / retrib) * 100);
  const retention = retentionPercent / 100;
  const annualIrpf = round2((retrib * retentionPercent) / 100);

  return {
    retention,
    retentionPercent,
    annualGross: retrib,
    annualIrpf,
    base,
    minPersonalFamiliar: minPerFa,
    cuota,
    explanation: `Algoritmo AEAT 2026 (orientativo): base ${base.toLocaleString('es-ES')} € − mínimo ${minPerFa.toLocaleString('es-ES')} € → tipo ${retentionPercent.toFixed(2).replace('.', ',')} %.`,
  };
}

/** Tipo 0–1 a partir de pensión mensual (14 pagas). */
export function estimateAeatPensionIrpfFromMonthly(
  monthlyGross: number | null | undefined,
  assumptions?: AeatIrpfAssumptions
): number | null {
  if (monthlyGross == null || !Number.isFinite(monthlyGross) || monthlyGross <= 0) {
    return null;
  }
  const est = estimateAeatPensionIrpf(monthlyGross * 14, assumptions);
  return est?.retention ?? null;
}
