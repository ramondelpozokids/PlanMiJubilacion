/**
 * Asesor DOCUMENTAL — interpreta solo lo que consta en el expediente.
 * No importa el motor de cálculo (fechas/pensión van en recalculate + UI).
 */
import type { ExpedienteDigital } from './types';

export function buildAdvisorInsights(expediente: ExpedienteDigital): ExpedienteDigital['advisor'] {
  const risks: string[] = [];
  const opportunities: string[] = [];
  const parts: string[] = [];

  const anos = expediente.resumen.anosCotizados?.value;
  const meses = expediente.resumen.mesesCotizados?.value ?? 0;
  const bases = expediente.bases.filter((b) => b.periodo?.value && b.base?.value != null);

  if (anos != null) {
    parts.push(
      `En los documentos constan aproximadamente ${anos} años y ${meses} meses cotizados.`
    );
  }

  if (expediente.periodos.length > 0) {
    parts.push(`${expediente.periodos.length} periodo(s) laboral(es) identificados.`);
  }

  if (bases.length > 0) {
    const first = bases[0].periodo?.value;
    const last = bases[bases.length - 1].periodo?.value;
    parts.push(
      `Hay ${bases.length} base(s) de cotización documentada(s)${
        first && last ? ` (${first} → ${last})` : ''
      }.`
    );
    if (bases.length < 300) {
      opportunities.push(
        'Sube el informe completo de bases (últimos 25 años) para una pensión estimada más precisa.'
      );
    }
  } else {
    opportunities.push('Sube el informe de bases de cotización para estimar el importe de pensión.');
  }

  if (expediente.lagunas.length > 0) {
    risks.push(
      `${expediente.lagunas.length} laguna(s) de cotización detectada(s) en la documentación.`
    );
    opportunities.push(
      'Si tienes resoluciones SEPE u otros justificantes, súbelos para completar esas lagunas.'
    );
  }

  if (expediente.discrepancies.filter((d) => !d.resolved).length > 0) {
    risks.push('Hay discrepancias entre documentos — conviene revisarlas en el expediente.');
  }

  const hasAutonomo = expediente.periodos.some((p) => p.categoria === 'autonomo');
  if (hasAutonomo) {
    parts.push('Constan periodos como autónomo (RETA).');
  }

  if (expediente.prestaciones.length > 0) {
    parts.push(`${expediente.prestaciones.length} prestación(es) documentada(s).`);
  }

  if (expediente.resoluciones.length > 0) {
    parts.push(`${expediente.resoluciones.length} certificado(s)/resolución(es) fusionado(s).`);
  }

  const summary =
    parts.length > 0
      ? parts.join(' ')
      : 'Sube tu vida laboral y bases para construir el expediente digital.';

  return {
    summary,
    risks,
    opportunities,
    updatedAt: new Date().toISOString(),
  };
}

export function enrichExpedienteWithAdvisor(expediente: ExpedienteDigital): ExpedienteDigital {
  return {
    ...expediente,
    advisor: buildAdvisorInsights(expediente),
  };
}
