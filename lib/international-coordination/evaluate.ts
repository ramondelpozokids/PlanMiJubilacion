/**
 * Evaluador de coordinación internacional.
 * No modifica ni estima la pensión española ni importes extranjeros.
 */
import { buildCountryInfo, isSpain } from './catalog';
import type {
  CoordinationFramework,
  CountryEvaluation,
  ForeignCotizationPeriod,
  InternationalCoordinationResult,
  InternationalCotizacionesData,
} from './types';

const LEGAL_DISCLAIMER =
  'Estimación orientativa. No sustituye la resolución del INSS ni del organismo extranjero competente.';

function pickPrimaryFramework(
  country: ReturnType<typeof buildCountryInfo>
): CoordinationFramework {
  if (country.euEeaCh) return 'eu_eea_ch';
  if (country.ukPostBrexit) return 'uk_tca';
  if (country.bilateralWithSpain) return 'bilateral';
  if (country.cmissMember) return 'cmiss';
  if (country.frameworks.includes('none')) return 'none';
  return 'unknown';
}

function legalBasisLabel(fw: CoordinationFramework): string {
  switch (fw) {
    case 'eu_eea_ch':
      return 'Reglamentos (CE) 883/2004 y 987/2009 (coordinación UE/EEE/Suiza)';
    case 'uk_tca':
      return 'Acuerdo UE-Reino Unido (TCA) — coordinación específica post-Brexit';
    case 'bilateral':
      return 'Convenio bilateral de Seguridad Social España–país tercero';
    case 'cmiss':
      return 'Convenio Multilateral Iberoamericano de Seguridad Social (CMISS)';
    case 'none':
      return 'Sin convenio de coordinación identificado con España';
    default:
      return 'Marco no determinado — requiere revisión profesional';
  }
}

function evaluatePeriod(period: ForeignCotizationPeriod): CountryEvaluation {
  const country =
    period.countryCode === 'OTHER'
      ? {
          code: 'OTHER',
          name: period.countryName || 'Otro país',
          frameworks: ['none' as const],
          bilateralWithSpain: false,
          cmissMember: false,
          euEeaCh: false,
          ukPostBrexit: false,
        }
      : buildCountryInfo(period.countryCode);

  const coordinationType = pickPrimaryFramework(country);
  const totalizationPossible =
    coordinationType === 'eu_eea_ch' ||
    coordinationType === 'uk_tca' ||
    coordinationType === 'bilateral' ||
    coordinationType === 'cmiss';

  const warnings: string[] = [LEGAL_DISCLAIMER];
  const nextSteps: string[] = [];

  if (!totalizationPossible) {
    warnings.push(
      'Los periodos en este país no se totalizan automáticamente con España salvo prueba documental adicional.'
    );
    nextSteps.push(
      'Consultar con el organismo de Seguridad Social del país y valorar asesoría especializada.'
    );
  } else {
    warnings.push(
      'Cada país calcula y paga su parte de pensión según su normativa (prorrata temporis).'
    );
    if (coordinationType === 'eu_eea_ch' || coordinationType === 'uk_tca') {
      nextSteps.push(
        'Solicitar pensión en el país de residencia (formulario Reglamentos Comunitarios / equivalente UK).'
      );
      nextSteps.push('Reunir certificados de periodos cotizados en cada país.');
    } else {
      nextSteps.push(
        'Usar formulario de jubilación por Convenios Bilaterales o CMISS en la Sede de la Seguridad Social.'
      );
      nextSteps.push('Solicitar al organismo extranjero certificado de periodos cotizados.');
    }
  }

  if (period.pensionAlreadyRequested) {
    warnings.push('Ya ha solicitado pensión en este país: verificar compatibilidad y duplicidades.');
  }

  if (period.stillContributing) {
    warnings.push('Sigue cotizando en el extranjero: la situación puede cambiar antes de la jubilación.');
  }

  if (!period.yearsContributed && !period.approximateStart) {
    warnings.push('Faltan datos de periodos: la evaluación es preliminar.');
    nextSteps.push('Aportar fechas o certificados oficiales de cotización del país.');
  }

  const documented =
    typeof period.documentedMonthlyPensionEur === 'number' &&
    Number.isFinite(period.documentedMonthlyPensionEur) &&
    period.documentedMonthlyPensionEur > 0
      ? period.documentedMonthlyPensionEur
      : null;

  if (documented != null) {
    warnings.push(
      `Importe extranjero documentado: ${documented.toFixed(2)} €/mes` +
        (period.documentedPensionSource ? ` (${period.documentedPensionSource})` : '') +
        '. Se puede sumar a la estimación española para ver el total a percibir.'
    );
    nextSteps.push(
      'Conservar la carta/resolución original del organismo extranjero junto al expediente español.'
    );
  } else {
    warnings.push(
      'No es posible estimar la pensión correspondiente a este país sin documento oficial. Añada el importe de la carta del organismo competente (p. ej. Alemania).'
    );
    nextSteps.push(
      'Cuando el país envíe la previsión o resolución de pensión, introdúzcala aquí para sumarla a España.'
    );
  }

  return {
    period,
    country,
    coordinationType,
    totalizationPossible,
    legalBasis: legalBasisLabel(coordinationType),
    foreignPensionDocumented: documented != null,
    documentedMonthlyEur: documented,
    warnings,
    nextSteps,
  };
}

export function evaluateInternationalCoordination(
  data: InternationalCotizacionesData | null | undefined
): InternationalCoordinationResult | null {
  if (!data?.hasWorkedAbroad || data.periods.length === 0) {
    return null;
  }

  const periods = data.periods.filter((p) => !isSpain(p.countryCode));
  if (periods.length === 0) return null;

  const evaluations = periods.map(evaluatePeriod);
  const totalizationPossibleAny = evaluations.some((e) => e.totalizationPossible);
  const multiplePensionsLikely = evaluations.filter((e) => e.totalizationPossible).length > 1;

  const globalWarnings: string[] = [
    LEGAL_DISCLAIMER,
    'La estimación de pensión española en PlanMiJubilación puede ser incompleta si existen cotizaciones en el extranjero.',
  ];

  if (multiplePensionsLikely) {
    globalWarnings.push(
      'Es probable que tenga derecho a varias pensiones parciales (una por cada país con coordinación).'
    );
  }

  const recommendations: string[] = [];
  if (totalizationPossibleAny) {
    recommendations.push(
      'Sus años cotizados en España y en determinados países pueden totalizarse para requisitos de acceso; cada país paga su parte.'
    );
    recommendations.push(
      'Si el organismo extranjero ya ha comunicado un importe (carta de pensión), introdúzcalo para sumarlo a la estimación española.'
    );
    recommendations.push('Iniciar la recopilación documental con al menos 12–24 meses de antelación.');
  } else {
    recommendations.push(
      'Sin coordinación aplicable en algún país declarado: solo computarán en España los periodos acreditados en España.'
    );
  }

  const summaryLines = evaluations.flatMap((ev) => {
    const years =
      ev.period.yearsContributed != null
        ? `${ev.period.yearsContributed} año(s) aprox.`
        : 'periodo no cuantificado';
    const total = ev.totalizationPossible ? 'Sí (coordinación aplicable)' : 'No / incierto';
    const doc =
      ev.documentedMonthlyEur != null
        ? ` Pensión documentada: ${ev.documentedMonthlyEur.toFixed(2)} €/mes.`
        : ' Sin importe extranjero documentado aún.';
    return [
      `${ev.country.name}: ${years}. Totalización: ${total}.${doc}`,
    ];
  });

  return {
    hasInternationalActivity: true,
    evaluations,
    totalizationPossibleAny,
    multiplePensionsLikely,
    spanishEstimateMayBeIncomplete: true,
    globalWarnings,
    recommendations,
    summaryLines,
  };
}

export function emptyInternationalCotizaciones(): InternationalCotizacionesData {
  return {
    hasWorkedAbroad: false,
    periods: [],
    updatedAt: new Date().toISOString(),
  };
}

export function parseInternationalFromForm(fd: FormData): InternationalCotizacionesData {
  const hasWorkedAbroad = fd.get('hasWorkedAbroad') === 'true';
  if (!hasWorkedAbroad) {
    return { hasWorkedAbroad: false, periods: [], updatedAt: new Date().toISOString() };
  }

  const raw = fd.get('periodsJson');
  let periods: ForeignCotizationPeriod[] = [];
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as ForeignCotizationPeriod[];
      if (Array.isArray(parsed)) {
        periods = parsed.map((p) => ({
          ...p,
          documentedMonthlyPensionEur:
            typeof p.documentedMonthlyPensionEur === 'number' &&
            Number.isFinite(p.documentedMonthlyPensionEur)
              ? p.documentedMonthlyPensionEur
              : null,
          documentedPensionSource: p.documentedPensionSource ?? null,
          documentedPensionDate: p.documentedPensionDate ?? null,
        }));
      }
    } catch {
      /* ignore */
    }
  }

  return {
    hasWorkedAbroad: true,
    periods,
    updatedAt: new Date().toISOString(),
  };
}
