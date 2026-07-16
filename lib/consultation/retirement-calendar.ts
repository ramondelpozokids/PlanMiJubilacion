import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { isSubsidio52Active } from '@/lib/calculator/life-path';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { formatCurrencyExact } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface RetirementMilestone {
  dateLabel: string;
  sortKey: string;
  title: string;
  detail: string;
  kind: 'today' | 'subsidio' | 'early' | 'ordinary' | 'freeze' | 'reference';
}

export function buildRetirementCalendar(
  outlook: RetirementOutlook,
  lifePath: LifePathAssumptions,
  asOf: Date = new Date()
): RetirementMilestone[] {
  const items: RetirementMilestone[] = [];

  items.push({
    dateLabel: format(asOf, 'dd/MM/yyyy', { locale: es }),
    sortKey: format(asOf, 'yyyyMMdd'),
    title: 'Hoy',
    detail: `${outlook.ageTodayLabel} · ${outlook.carrera.years} años y ${outlook.carrera.months} meses cotizados`,
    kind: 'today',
  });

  if (isSubsidio52Active(lifePath)) {
    const [y, m] = lifePath.subsidioMayores52From.split('-');
    const d = new Date(Number(y), Number(m) - 1, 1);
    items.push({
      dateLabel: format(d, 'dd/MM/yyyy', { locale: es }),
      sortKey: format(d, 'yyyyMMdd'),
      title: 'Inicio subsidio mayores de 52',
      detail: lifePath.currentlyUnemployed
        ? 'Cotización a la SS con base del subsidio (según parámetros legales)'
        : 'Hipótesis de inicio del subsidio +52',
      kind: 'subsidio',
    });
  }

  if (outlook.earlyVoluntary.earliestEligibleDate) {
    items.push({
      dateLabel: outlook.earlyVoluntary.earliestEligibleLabel ?? '—',
      sortKey: format(outlook.earlyVoluntary.earliestEligibleDate, 'yyyyMMdd'),
      title: 'Primera jubilación anticipada posible',
      detail: `Desde los ${outlook.earlyVoluntary.minAge} años con ${outlook.earlyVoluntary.minYearsRequired} años cotizados`,
      kind: 'early',
    });
  }

  for (const s of outlook.earlyVoluntary.scenarios) {
    items.push({
      dateLabel: format(s.retirementDate, 'dd/MM/yyyy', { locale: es }),
      sortKey: format(s.retirementDate, 'yyyyMMdd'),
      title: `Anticipada · ${s.label}`,
      detail: [
        `Reducción −${s.reductionPercent}%`,
        s.estimatedMonthly != null
          ? `Pensión est. ${formatCurrencyExact(s.estimatedMonthly)}/mes`
          : null,
      ]
        .filter(Boolean)
        .join(' · '),
      kind: 'early',
    });
  }

  items.push({
    dateLabel: outlook.ordinary.dateLabel,
    sortKey: format(outlook.ordinary.date, 'yyyyMMdd'),
    title: 'Jubilación ordinaria',
    detail: [
      `A los ${outlook.ordinary.ageLabel}`,
      outlook.pension.ordinaryResult
        ? `Pensión est. ${formatCurrencyExact(outlook.pension.ordinaryResult.monthlyPension)}/mes`
        : 'Pendiente de bases documentadas',
    ].join(' · '),
    kind: 'ordinary',
  });

  if (outlook.ordinaryIfFreeze) {
    items.push({
      dateLabel: outlook.ordinaryIfFreeze.dateLabel,
      sortKey: outlook.ordinary.dateLabel,
      title: 'Si deja de cotizar (freeze)',
      detail: `Ordinaria a los ${outlook.ordinaryIfFreeze.ageLabel} sin más cotización`,
      kind: 'freeze',
    });
  }

  const sim = outlook.pension.officialSimReference;
  if (sim?.pensionMensual) {
    items.push({
      dateLabel: sim.fechaJubilacion ?? '—',
      sortKey: sim.fechaJubilacion?.split('/').reverse().join('') ?? '99999999',
      title: 'Referencia simulación SS',
      detail: `${formatCurrencyExact(sim.pensionMensual)}/mes · empleo continuo (no es su escenario real)`,
      kind: 'reference',
    });
  }

  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
