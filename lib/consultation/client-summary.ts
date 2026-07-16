import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { isSubsidio52Active } from '@/lib/calculator/life-path';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import type { MiopRunResult } from '@/lib/optimization/types';
import { evaluateInternationalCoordination } from '@/lib/international-coordination/evaluate';
import type { InternationalCotizacionesData } from '@/lib/international-coordination/types';
import { formatCurrencyExact } from '@/lib/utils';

export function buildConsultationSummary(options: {
  clientName: string;
  outlook: RetirementOutlook;
  lifePath: LifePathAssumptions;
  miop: MiopRunResult | null;
  internationalCotizaciones?: InternationalCotizacionesData | null;
}): string[] {
  const { clientName, outlook, lifePath, miop, internationalCotizaciones } = options;
  const lines: string[] = [];

  lines.push(
    `${clientName}: ${outlook.carrera.years} años y ${outlook.carrera.months} meses cotizados (${outlook.ageTodayLabel} hoy).`
  );

  if (outlook.pension.ordinaryResult) {
    lines.push(
      `Jubilación ordinaria el ${outlook.ordinary.dateLabel} (a los ${outlook.ordinary.ageLabel}): pensión orientativa ${formatCurrencyExact(outlook.pension.ordinaryResult.monthlyPension)}/mes.`
    );
  } else {
    lines.push(
      'Faltan bases documentadas suficientes para estimar la pensión con fiabilidad.'
    );
  }

  if (outlook.earlyVoluntary.scenarios.length > 0) {
    const best = outlook.earlyVoluntary.scenarios[0];
    lines.push(
      `Si se jubila anticipadamente a los ${best.retirementAge} años: reducción del ${best.reductionPercent}%` +
        (best.estimatedMonthly != null
          ? ` → unos ${formatCurrencyExact(best.estimatedMonthly)}/mes.`
          : '.')
    );
  }

  if (isSubsidio52Active(lifePath)) {
    lines.push(
      `Escenario con subsidio mayores de 52 desde ${lifePath.subsidioMayores52From.replace('-', '/')}.`
    );
  } else if (lifePath.currentlyUnemployed) {
    lines.push('En paro actualmente; sin subsidio +52 activado en el escenario.');
  }

  if (miop?.podium[0]) {
    const top = miop.podium[0];
    lines.push(
      `Mejor estrategia MIOP (puntuación ${top.score}/100): ${top.outcome.strategyName}` +
        (top.outcome.pensionMensual != null
          ? ` → ${formatCurrencyExact(top.outcome.pensionMensual)}/mes.`
          : '.')
    );
  }

  const intl = evaluateInternationalCoordination(internationalCotizaciones ?? null);
  if (intl) {
    lines.push('— Cotizaciones internacionales —');
    lines.push(
      'España y el extranjero pueden totalizar años para requisitos; cada país paga su parte.'
    );
    lines.push(...intl.summaryLines.slice(0, 5));

    const spain = outlook.pension.ordinaryResult?.monthlyPension ?? null;
    const foreignSum = intl.evaluations.reduce(
      (acc, ev) => acc + (ev.documentedMonthlyEur ?? 0),
      0
    );
    if (spain != null && foreignSum > 0) {
      lines.push(
        `Total orientativo España + extranjero documentado: ${formatCurrencyExact(spain + foreignSum)}/mes.`
      );
    } else if (foreignSum === 0) {
      lines.push(
        'Pendiente: introducir el importe de la carta extranjera para sumarlo a la pensión española.'
      );
    }
  }

  lines.push(
    'Cifras orientativas a partir de documentos aportados. No sustituyen el cálculo oficial de la Seguridad Social.'
  );

  return lines;
}
