// lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DOCUMENT_TYPES } from '@/lib/expediente/document-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Cifras exactas en informes (siempre 2 decimales). */
export function formatCurrencyExact(amount: number, locale = 'es-ES'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string, locale = 'es-ES'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/** Corrige mojibake habitual en nombres de PDF (CotizaciÃ³n → Cotización). */
export function displayFileName(name: string | null | undefined): string {
  if (!name) return '—';
  let s = name;
  try {
    if (/Ã.|Â./.test(s)) {
      s = new TextDecoder('utf-8').decode(
        Uint8Array.from(s, (c) => c.charCodeAt(0))
      );
    }
  } catch {
    /* keep original */
  }
  if (s.length > 48 && (/^SPEE\./i.test(s) || /^[A-Z0-9._-]{40,}$/i.test(s))) {
    return `${s.slice(0, 28)}…${s.slice(-8)}`;
  }
  return s;
}

/** Etiqueta legible para tipos documentales / slugs. */
export function humanizeTypeLabel(raw: string | null | undefined): string {
  if (!raw) return '—';
  if (raw in DOCUMENT_TYPES) {
    return DOCUMENT_TYPES[raw as keyof typeof DOCUMENT_TYPES];
  }
  const map: Record<string, string> = {
    vida_laboral: 'Vida laboral',
    bases_cotizacion: 'Bases de cotización',
    simulacion_jubilacion: 'Simulación de jubilación',
    resolucion_inss: 'Resolución INSS',
    resolucion_sepe: 'Resolución SEPE',
    certificado_empresa: 'Certificado de empresa',
    prestacion_desempleo: 'Prestación desempleo',
    subsidio: 'Subsidio',
    convenio_especial: 'Convenio especial',
    nomina: 'Nómina',
    declaracion_fiscal: 'Declaración fiscal',
    pension_extranjera: 'Pensión / carta extranjera',
  };
  if (map[raw]) return map[raw];
  if (raw.includes(' ') || /[áéíóúñÁÉÍÓÚÑ]/.test(raw) || raw.includes('.')) return raw;
  return raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
