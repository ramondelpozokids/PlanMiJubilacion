/**
 * Cotización y carrera a precisión día (años + meses + días).
 */
import { addDays, addMonths, addYears, format } from 'date-fns';

export interface Ymd {
  years: number;
  months: number;
  days: number;
}

export function ymdLabel(p: Ymd): string {
  const bits: string[] = [];
  if (p.years > 0) bits.push(`${p.years} año${p.years === 1 ? '' : 's'}`);
  if (p.months > 0) bits.push(`${p.months} mes${p.months === 1 ? '' : 'es'}`);
  if (p.days > 0 || bits.length === 0) bits.push(`${p.days} día${p.days === 1 ? '' : 's'}`);
  return bits.join(', ');
}

/** Normaliza desbordes (p. ej. 13 meses → +1 año). */
export function normalizeYmd(p: Ymd): Ymd {
  let { years, months, days } = p;
  if (days < 0) {
    months -= 1;
    days += 30; // mes convencional SS ~30 días para restas de resto
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  years += Math.floor(months / 12);
  months = ((months % 12) + 12) % 12;
  if (days >= 30) {
    months += Math.floor(days / 30);
    days = days % 30;
    years += Math.floor(months / 12);
    months = months % 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export function subtractYmd(a: Ymd, b: Ymd): Ymd {
  // a − b (p. ej. requerido − actual)
  let years = a.years - b.years;
  let months = a.months - b.months;
  let days = a.days - b.days;
  if (days < 0) {
    months -= 1;
    days += 30;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years: Math.max(0, years), months: Math.max(0, months), days: Math.max(0, days) };
}

export function addYmdToDate(from: Date, delta: Ymd): Date {
  let d = addYears(from, delta.years);
  d = addMonths(d, delta.months);
  d = addDays(d, delta.days);
  return d;
}

export function ymdToApproxMonths(p: Ymd): number {
  return Math.round(p.years * 12 + p.months + p.days / 30.4375);
}

export function monthsRequirementToYmd(totalMonths: number): Ymd {
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: 0,
  };
}

export function formatYmdShort(p: Ymd): string {
  return `${p.years}a · ${p.months}m · ${p.days}d`;
}

export function formatDateDmy(d: Date): string {
  return format(d, 'dd/MM/yyyy');
}
