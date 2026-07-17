import type { AnticipationBreakdown } from './types';

/**
 * Anticipo exacto entre fecha ordinaria y fecha elegida.
 * Meses legales = meses completos + 1 si queda fracción de mes (días > 0),
 * conforme a arts. 207.2 y 208.2 LGSS («mes o fracción de mes»).
 */
export function computeAnticipation(
  ordinaryDate: Date,
  chosenDate: Date
): AnticipationBreakdown {
  const ordinary = startOfDay(ordinaryDate);
  const chosen = startOfDay(chosenDate);

  if (chosen.getTime() > ordinary.getTime()) {
    return { years: 0, months: 0, days: 0, monthsEarly: 0, isDeferred: true };
  }
  if (chosen.getTime() === ordinary.getTime()) {
    return { years: 0, months: 0, days: 0, monthsEarly: 0, isDeferred: false };
  }

  let years = ordinary.getFullYear() - chosen.getFullYear();
  let months = ordinary.getMonth() - chosen.getMonth();
  let days = ordinary.getDate() - chosen.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonthLastDay = new Date(ordinary.getFullYear(), ordinary.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const completeMonths = years * 12 + months;
  const monthsEarly = completeMonths + (days > 0 ? 1 : 0);

  return {
    years,
    months,
    days,
    monthsEarly,
    isDeferred: false,
  };
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
