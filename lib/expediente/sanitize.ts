/**
 * Limpieza de valores OCR ruidosos (ciudad como empresa, etc.)
 */

const SPANISH_LOCATIONS = new Set(
  [
    'madrid',
    'barcelona',
    'valencia',
    'sevilla',
    'zaragoza',
    'malaga',
    'málaga',
    'bilbao',
    'murcia',
    'alicante',
    'cordoba',
    'córdoba',
    'valladolid',
    'vigo',
    'gijon',
    'gijón',
    'hospitalet',
    'granada',
    'vitoria',
    'oviedo',
    'santa cruz',
    'pamplona',
    'almeria',
    'almería',
    'san sebastian',
    'san sebastián',
    'donostia',
    'castellon',
    'castellón',
    'burgos',
    'albacete',
    'santander',
    'logrono',
    'logroño',
    'badajoz',
    'salamanca',
    'huelva',
    'lerida',
    'lleida',
    'tarragona',
    'leon',
    'león',
    'cadiz',
    'cádiz',
    'jaen',
    'jaén',
    'ourense',
    'orense',
    'girona',
    'gerona',
    'espana',
    'españa',
    'spain',
  ].map((s) => s.toLowerCase())
);

export function isLikelyLocationNotCompany(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const t = raw.trim().toLowerCase();
  if (t.length < 3) return true;
  if (SPANISH_LOCATIONS.has(t)) return true;
  // "MADRID (COMUNIDAD)" etc.
  if ([...SPANISH_LOCATIONS].some((loc) => t === loc || t.startsWith(`${loc} `))) return true;
  return false;
}

export function sanitizeCompanyName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (isLikelyLocationNotCompany(cleaned)) return null;
  return cleaned;
}

export function parseDmy(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const m = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function rangesOverlapDays(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): number {
  const start = Math.max(aStart.getTime(), bStart.getTime());
  const end = Math.min(aEnd.getTime(), bEnd.getTime());
  if (end < start) return 0;
  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function startOfCurrentMonth(asOf: Date = new Date()): Date {
  return new Date(asOf.getFullYear(), asOf.getMonth(), 1);
}

export function endOfToday(asOf: Date = new Date()): Date {
  return new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 23, 59, 59, 999);
}

/**
 * Periodo mensual MM/YYYY solo si ≤ mes actual.
 * Descarta meses futuros y etiquetas "presente"/proyección.
 */
export function isContributionMonthOnOrBeforeToday(
  period: string | null | undefined,
  asOf: Date = new Date()
): boolean {
  if (!period) return false;
  const lower = period.toLowerCase();
  if (/presente|actual|futuro|proyec|jubilaci/i.test(lower)) return false;

  const m1 = period.match(/(\d{2})[\/\-](\d{4})/);
  if (m1) {
    const month = Number(m1[1]);
    const year = Number(m1[2]);
    if (month < 1 || month > 12) return false;
    return new Date(year, month - 1, 1).getTime() <= startOfCurrentMonth(asOf).getTime();
  }

  const m2 = period.match(/(\d{4})-(\d{2})/);
  if (m2) {
    const year = Number(m2[1]);
    const month = Number(m2[2]);
    if (month < 1 || month > 12) return false;
    return new Date(year, month - 1, 1).getTime() <= startOfCurrentMonth(asOf).getTime();
  }

  const d = parseDmy(period);
  if (d) return d.getTime() <= endOfToday(asOf).getTime();
  return false;
}

export function clipEndDateToToday(
  raw: string | null | undefined,
  asOf: Date = new Date()
): string | null {
  if (!raw) return null;
  if (/presente|actual|en vigor/i.test(raw)) {
    const dd = String(asOf.getDate()).padStart(2, '0');
    const mm = String(asOf.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${asOf.getFullYear()}`;
  }
  const d = parseDmy(raw);
  if (!d) return raw;
  if (d.getTime() > endOfToday(asOf).getTime()) {
    const dd = String(asOf.getDate()).padStart(2, '0');
    const mm = String(asOf.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${asOf.getFullYear()}`;
  }
  return raw;
}

/** Excluye altas futuras; recorta bajas "presente"/futuras a hoy. */
export function filterPeriodToToday<
  T extends {
    fechaAlta: { value: string } | null;
    fechaBaja: { value: string } | null;
  },
>(period: T, asOf: Date = new Date()): T | null {
  const alta = period.fechaAlta?.value;
  const altaDate = parseDmy(alta ?? null);
  if (altaDate && altaDate.getTime() > endOfToday(asOf).getTime()) return null;

  if (period.fechaBaja) {
    const clipped = clipEndDateToToday(period.fechaBaja.value, asOf);
    if (clipped !== period.fechaBaja.value) {
      return {
        ...period,
        fechaBaja: { ...period.fechaBaja, value: clipped! },
      };
    }
  }
  return period;
}

