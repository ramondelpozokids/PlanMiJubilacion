/**
 * Conclusiones MIOP — plantillas deterministas (la IA solo puede redactar encima).
 * Prohibido inventar cifras: solo EconomicOutcome + ranking.
 */
import type { ScoredStrategy } from './types';

export function buildMiopConclusions(podium: ScoredStrategy[]): string[] {
  if (podium.length === 0) {
    return [
      'No hay estrategias puntuables aún. Relee el Informe Integral de Bases de Cotización.',
    ];
  }

  const best = podium[0];
  const second = podium[1];
  const lines: string[] = [];

  lines.push(
    `Mejor estrategia: «${best.outcome.strategyName}» (${best.score}/100). ${best.explanation}`
  );

  if (best.outcome.pensionMensual != null && second?.outcome.pensionMensual != null) {
    const delta = best.outcome.pensionMensual - second.outcome.pensionMensual;
    if (Math.abs(delta) >= 1) {
      lines.push(
        `Respecto a la 2ª opción, la diferencia de pensión es ${delta >= 0 ? '+' : ''}${delta.toLocaleString('es-ES')} €/mes.`
      );
    }
  }

  if (best.outcome.monthsEarly === 0) {
    lines.push('No recomendamos anticipar: la mejor opción llega a (o cerca de) la ordinaria.');
  } else {
    lines.push(
      `La mejor opción anticipa ${best.outcome.monthsEarly} meses (reducción ≈ ${best.outcome.reductionPercent}%). Valora si el flujo hasta entonces compensa.`
    );
  }

  if (best.outcome.convenioCost > 0 && best.outcome.breakEvenMonths != null) {
    lines.push(
      `El Convenio Especial de esta estrategia cuesta ${best.outcome.convenioCost.toLocaleString('es-ES')} €; recuperación orientativa ≈ ${best.outcome.breakEvenMonths} meses de diferencial.`
    );
  } else if (!best.outcome.legalFlags.includes('convenio')) {
    const withConvenio = podium.find((p) => p.outcome.convenioCost > 0);
    if (withConvenio && withConvenio.score < best.score - 5) {
      lines.push(
        'El subsidio para mayores de 52 años resulta más favorable que un Convenio Especial en las opciones exploradas.'
      );
    }
  }

  if (best.outcome.lifetimeBenefit != null) {
    lines.push(
      `Beneficio acumulado estimado (esperanza de vida del Motor Económico): ${best.outcome.lifetimeBenefit.toLocaleString('es-ES')} €.`
    );
  }

  lines.push(
    'La simulación oficial SS (empleo continuo) es solo referencia: no es tu escenario actual.'
  );

  return lines;
}
