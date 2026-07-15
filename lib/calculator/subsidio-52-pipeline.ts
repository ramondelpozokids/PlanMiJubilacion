/**
 * Pipeline ERP subsidio +52 (cadena innegociable):
 *
 *   IPREM × 95% → bruto → neto → base cotización → impacto jubilación → comparativa → informe
 *
 * Las bases anuales viven en `lib/rules/subsidio-52-params.json`.
 * Cambias un año (p.ej. 2028) → en el siguiente `buildRetirementOutlook` / `recalculate`
 * todo el ERP (pensión, escenarios, informe) se recalcula solo.
 */
import type { ExpedienteDigital } from '@/lib/expediente/types';
import {
  deriveSubsidio52Amounts,
  getSubsidio52Config,
  resolveRawParams,
  yearParamsMap,
} from '@/lib/rules/subsidio-52';
import { DEFAULT_LIFE_PATH, type LifePathAssumptions } from './life-path';
import {
  getOfficialSimulation,
  getRealPensionSnapshot,
} from './real-pension';
import {
  pensionImpactFromSubsidio,
  projectSubsidio52,
  type Subsidio52Projection,
} from './subsidio-52';

export const SUBSIDIO_PIPELINE_STEPS = [
  'bruto',
  'neto',
  'baseCotizacion',
  'impactoJubilacion',
  'comparativa',
  'informe',
] as const;

export type SubsidioPipelineStep = (typeof SUBSIDIO_PIPELINE_STEPS)[number];

export interface SubsidioComparativa {
  tuEscenario: {
    label: string;
    pensionMensual: number | null;
    baseCotizacionMensual: number;
    subsidioBruto: number;
    subsidioNeto: number;
  };
  sinCotizarMas: {
    label: string;
    pensionMensual: number | null;
  };
  simulacionSs: {
    label: string;
    pensionMensual: number | null;
    note: string;
  };
  deltas: {
    vsFreeze: number | null;
    vsSimSs: number | null;
  };
}

export interface SubsidioInformeBlock {
  title: string;
  generatedAt: string;
  formulaBruto: string;
  steps: Array<{
    id: SubsidioPipelineStep;
    label: string;
    value: string;
  }>;
  yearsInParams: number[];
  paramsFingerprint: string;
  legalNotes: string[];
}

export interface Subsidio52ErpPipeline {
  /** Cadena completa */
  steps: typeof SUBSIDIO_PIPELINE_STEPS;
  projection: Subsidio52Projection;
  comparativa: SubsidioComparativa;
  informe: SubsidioInformeBlock;
  /** Hash corto del JSON de params — cambia al editar fichas anuales */
  paramsFingerprint: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/** Fingerprint estable del JSON de parámetros (para auditoría / UI). */
export function paramsFingerprint(): string {
  const json = JSON.stringify(yearParamsMap());
  let h = 0;
  for (let i = 0; i < json.length; i++) h = (Math.imul(31, h) + json.charCodeAt(i)) | 0;
  return `s52-${(h >>> 0).toString(16)}`;
}

export function yearsDeclaredInParams(): number[] {
  return Object.keys(yearParamsMap())
    .map(Number)
    .sort((a, b) => a - b);
}

/**
 * Construye el pipeline ERP completo a partir del expediente + fecha ordinaria.
 * Se invoca en cada outlook/recalculate → editar el JSON basta para refrescar cifras.
 */
export function buildSubsidio52ErpPipeline(options: {
  expediente: ExpedienteDigital;
  retirementDate: Date;
  freezeRetirementDate: Date;
  pensionWithPath: number | null;
  lifePath?: LifePathAssumptions;
  asOf?: Date;
}): Subsidio52ErpPipeline {
  const lifePath = options.lifePath ?? DEFAULT_LIFE_PATH;
  const asOf = options.asOf ?? new Date();
  const startYm = lifePath.subsidioMayores52From;
  const startYear = Number(startYm.slice(0, 4)) || 2027;

  const projection = projectSubsidio52({
    referenceYear: startYear,
    fromYm: startYm,
    retirementDate: options.retirementDate,
  });

  const freezePath: LifePathAssumptions = {
    ...lifePath,
    subsidioMayores52From: '2099-01',
    desempleoBaseAntesSubsidio: 0,
    subsidioCotizacionBase: null,
  };
  const freezeSnap = getRealPensionSnapshot(options.expediente, {
    lifePath: freezePath,
    retirementDate: options.freezeRetirementDate,
    asOf,
  });
  const sim = getOfficialSimulation(options.expediente);
  const impact = pensionImpactFromSubsidio({
    pensionWithSubsidioPath: options.pensionWithPath,
    pensionIfFreeze: freezeSnap.ordinaryMonthly,
    officialSimReference: sim?.pensionMensual ?? null,
  });

  const cfg = projection.config;
  const amounts = deriveSubsidio52Amounts(cfg);
  const resolved = resolveRawParams(startYear);

  const comparativa: SubsidioComparativa = {
    tuEscenario: {
      label: 'Desempleo → subsidio +52 (tu caso)',
      pensionMensual: options.pensionWithPath,
      baseCotizacionMensual: amounts.baseCotizacion,
      subsidioBruto: amounts.subsidioBruto,
      subsidioNeto: amounts.subsidioNeto,
    },
    sinCotizarMas: {
      label: 'Sin cotizar más (freeze)',
      pensionMensual: freezeSnap.ordinaryMonthly,
    },
    simulacionSs: {
      label: 'Simulación SS (empleo continuo)',
      pensionMensual: sim?.pensionMensual ?? null,
      note: 'Hipótesis oficial — no es tu escenario',
    },
    deltas: {
      vsFreeze: impact.vsFreezeMonthly,
      vsSimSs: impact.vsOfficialSimMonthly,
    },
  };

  const fp = paramsFingerprint();
  const informe: SubsidioInformeBlock = {
    title: 'Informe pipeline subsidio mayores de 52',
    generatedAt: new Date().toISOString(),
    formulaBruto: `IPREM × ${(cfg.subsidioPercentOfIprem * 100).toFixed(0)}% = ${cfg.ipremMonthly} × ${cfg.subsidioPercentOfIprem} = ${fmt(amounts.subsidioBruto)}`,
    steps: [
      {
        id: 'bruto',
        label: 'Subsidio bruto',
        value: fmt(amounts.subsidioBruto),
      },
      {
        id: 'neto',
        label: 'Subsidio neto',
        value: `${fmt(amounts.subsidioNeto)} (IRPF ${(cfg.irpfRetentionRate * 100).toFixed(0)}%)`,
      },
      {
        id: 'baseCotizacion',
        label: 'Base cotización',
        value: fmt(amounts.baseCotizacion),
      },
      {
        id: 'impactoJubilacion',
        label: 'Impacto jubilación',
        value:
          options.pensionWithPath != null
            ? `Pensión estimada ${fmt(options.pensionWithPath)}/mes · ${projection.untilRetirement.months} meses de cotización +52`
            : 'Pendiente informe de bases documentado',
      },
      {
        id: 'comparativa',
        label: 'Comparativa',
        value: [
          comparativa.deltas.vsFreeze != null
            ? `vs freeze ${comparativa.deltas.vsFreeze >= 0 ? '+' : ''}${fmt(comparativa.deltas.vsFreeze)}`
            : 'vs freeze —',
          comparativa.deltas.vsSimSs != null
            ? `vs sim SS ${comparativa.deltas.vsSimSs >= 0 ? '+' : ''}${fmt(comparativa.deltas.vsSimSs)}`
            : 'vs sim SS —',
        ].join(' · '),
      },
      {
        id: 'informe',
        label: 'Informe',
        value: `Años JSON ${yearsDeclaredInParams().join(', ')} · fp ${fp}${
          resolved.inheritedFrom != null ? ` · hereda ${resolved.inheritedFrom}` : ''
        }`,
      },
    ],
    yearsInParams: yearsDeclaredInParams(),
    paramsFingerprint: fp,
    legalNotes: [cfg.notes, ...cfg.sources],
  };

  return {
    steps: SUBSIDIO_PIPELINE_STEPS,
    projection,
    comparativa,
    informe,
    paramsFingerprint: fp,
  };
}

/** Helper: listar qué haría el ERP si rellenas un año vacío (p.ej. 2028). */
export function previewYearOverrideEffect(
  year: number,
  override: {
    iprem: number;
    smi: number;
    baseMinima: number;
    subsidio52: number;
    cotizacion52: number;
    irpfDefecto: number;
  }
): { bruto: number; neto: number; baseCotizacion: number; rentLimit: number } {
  const bruto = round2(override.iprem * override.subsidio52);
  const irpf = round2(bruto * override.irpfDefecto);
  return {
    bruto,
    neto: round2(bruto - irpf),
    baseCotizacion: round2(override.baseMinima),
    rentLimit: round2(override.smi * 0.75),
  };
}

export function getActiveSubsidioConfigNote(year = 2027): string {
  const cfg = getSubsidio52Config(year);
  const d = deriveSubsidio52Amounts(cfg);
  return `Año ${year}: bruto ${fmt(d.subsidioBruto)} · base ${fmt(d.baseCotizacion)} (${cfg.status})`;
}
