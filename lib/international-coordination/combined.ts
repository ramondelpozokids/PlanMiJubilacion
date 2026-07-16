/**
 * Suma orientativa: pensión española (estimación) + pensiones extranjeras documentadas.
 * No inventa importes: solo usa cifras aportadas del organismo extranjero.
 */
import type { InternationalCoordinationResult } from './types';
import { formatCurrencyExact } from '@/lib/utils';

export interface CombinedPensionLine {
  label: string;
  countryCode: string;
  monthlyEur: number | null;
  source: 'spain_estimate' | 'foreign_documented' | 'foreign_pending';
  note: string;
}

export interface CombinedPensionSummary {
  lines: CombinedPensionLine[];
  spainMonthly: number | null;
  foreignDocumentedTotal: number;
  combinedMonthly: number | null;
  hasUndocumentedForeign: boolean;
  explanation: string;
  legalNote: string;
}

export function buildCombinedPensionSummary(options: {
  spainMonthly: number | null;
  spainLabel?: string;
  coordination: InternationalCoordinationResult | null;
}): CombinedPensionSummary | null {
  const { spainMonthly, coordination } = options;
  if (!coordination?.hasInternationalActivity) return null;

  const lines: CombinedPensionLine[] = [
    {
      label: options.spainLabel ?? 'Pensión España (estimación PlanMi)',
      countryCode: 'ES',
      monthlyEur: spainMonthly,
      source: 'spain_estimate',
      note: 'Cálculo orientativo con bases españolas. No es resolución del INSS.',
    },
  ];

  let foreignDocumentedTotal = 0;
  let hasUndocumentedForeign = false;

  for (const ev of coordination.evaluations) {
    const amount = ev.documentedMonthlyEur;
    if (amount != null && amount > 0) {
      foreignDocumentedTotal += amount;
      lines.push({
        label: `Pensión ${ev.country.name} (documento oficial)`,
        countryCode: ev.country.code,
        monthlyEur: amount,
        source: 'foreign_documented',
        note:
          ev.period.documentedPensionSource?.trim() ||
          'Importe comunicado por el organismo extranjero.',
      });
    } else {
      hasUndocumentedForeign = true;
      lines.push({
        label: `Pensión ${ev.country.name}`,
        countryCode: ev.country.code,
        monthlyEur: null,
        source: 'foreign_pending',
        note: 'Aún no hay importe documentado. Sube la carta/resolución del país o introdúcelo en el asistente.',
      });
    }
  }

  const combinedMonthly =
    spainMonthly != null ? spainMonthly + foreignDocumentedTotal : null;

  const explanation =
    foreignDocumentedTotal > 0
      ? 'En la UE (y con muchos convenios) no se cobra «una sola pensión mezclada»: España paga su parte y el otro país la suya. La suma de ambas es lo que puede percibir en total al mes.'
      : 'Los años cotizados en España y en el extranjero pueden totalizarse para cumplir requisitos de acceso, pero cada país calcula y paga su propia parte. Cuando tenga la carta del organismo extranjero, añada el importe para ver el total.';

  return {
    lines,
    spainMonthly,
    foreignDocumentedTotal,
    combinedMonthly,
    hasUndocumentedForeign,
    explanation,
    legalNote:
      'Cifras orientativas. La pensión extranjera solo se suma cuando procede de documento oficial aportado. No sustituye resoluciones del INSS ni del organismo extranjero.',
  };
}

export function formatCombinedLines(summary: CombinedPensionSummary): string[] {
  const out: string[] = [summary.explanation];
  for (const line of summary.lines) {
    const amt =
      line.monthlyEur != null ? formatCurrencyExact(line.monthlyEur) + '/mes' : 'pendiente de documento';
    out.push(`${line.label}: ${amt}`);
  }
  if (summary.combinedMonthly != null) {
    out.push(
      `Total orientativo (España + extranjero documentado): ${formatCurrencyExact(summary.combinedMonthly)}/mes.`
    );
  }
  out.push(summary.legalNote);
  return out;
}
