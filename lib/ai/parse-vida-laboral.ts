/**
 * Parser determinista del Informe de Vida Laboral (TGSS / Import@ss).
 * Layout real verificado con PDF oficial (fechas DD.MM.YYYY, régimen GENERAL/AUTONOMO).
 */

import type {
  PeriodoLaboral,
  PrestacionDesempleo,
  VidaLaboralCompleta,
} from '@/lib/ai/vida-laboral-types';
import {
  cleanPersonName,
  computeAge,
  isGarbageCompany,
  parseSegSocialDocument,
} from '@/lib/ai/parse-seg-social';

/** Fechas en vida laboral oficial: 03.07.2025 o a veces 03/07/2025 */
const DATE_TOKEN = String.raw`(\d{2}[./]\d{2}[./]\d{4})`;
const DATE_RE = new RegExp(DATE_TOKEN, 'g');
const OPEN_CCC = /^-+$/;

const REGIMEN_WORD_RE = /^(GENERAL|AUTONOMO|AUT[OÓ]NOMO|AGRARIO|HOGAR|MAR|CARB[OÓ]N|MINERIA|MINER[IÍ]A)$/i;

const ASIMILADA_HINT =
  /desempleo|paro|subsidio|convenio\s*especial|vacaciones\s*retribuidas|asimilad|prestaci[oó]n|sepe|fogasa|maternidad|paternidad|excedencia/i;

export interface ParsedVidaLaboralPeriodos {
  periodosContrato: PeriodoLaboral[];
  periodosAutonomo: PeriodoLaboral[];
  situacionesAsimiladas: PeriodoLaboral[];
  prestacionesDesempleo: PrestacionDesempleo[];
}

function toSlashDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{2})[./](\d{2})[./](\d{4})$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function parseDiasToken(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const t = raw.replace(/\./g, '').replace(',', '.');
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 50000) return null;
  return n;
}

function regimenLabel(word: string): string {
  const w = word
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase();
  if (w.startsWith('AUTONOM')) return 'autonomos';
  if (w === 'AGRARIO') return 'agrario';
  if (w === 'HOGAR') return 'hogar';
  if (w === 'MAR') return 'mar';
  if (w.startsWith('CARBON') || w.startsWith('MINER')) return 'carbon';
  return 'general';
}

function classifyTipo(
  regimen: string,
  empresa: string | null,
  ccc: string | null
): PeriodoLaboral['tipo'] {
  if (regimen === 'autonomos') return 'autonomo';
  if (empresa && ASIMILADA_HINT.test(empresa)) return 'otro';
  if ((!ccc || OPEN_CCC.test(ccc)) && empresa && ASIMILADA_HINT.test(empresa)) return 'otro';
  return 'contrato';
}

function cleanEmpresa(raw: string | null): string | null {
  if (!raw) return null;
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/^[\s\-–|/]+|[\s\-–|/]+$/g, '').trim();
  if (!s || s.length < 2) return null;
  if (isGarbageCompany(s)) return null;
  if (/^(r[eé]gimen|empresa|situaci[oó]n|fecha|d[ií]as|alta|baja|general|autonomo)$/i.test(s)) {
    return null;
  }
  // Provincia sola en autónomos (MADRID) → etiqueta genérica
  if (/^[A-ZÁÉÍÓÚÑ\s]{3,20}$/i.test(s) && s.length < 15 && !/\b(S\.?L|S\.?A|E\.?T\.?T)/i.test(s)) {
    // keep — puede ser provincia de autónomo
  }
  return s;
}

/**
 * Une líneas rotas del PDF: empresa en línea siguiente, fechas en otra.
 * Ejemplo real:
 *   GENERAL 28008801213 EMBAJADA REPUBLICA FEDERAL
 *   ALEMANA
 *   01.09.1999 01.09.1999 07.02.2024 100 --- 08 8.926
 */
function flattenSituacionLines(text: string): string[] {
  const raw = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!REGIMEN_WORD_RE.test(line.split(/\s+/)[0] ?? '')) {
      continue;
    }

    let merged = line;
    let j = i + 1;
    // Mientras la siguiente línea no empiece por régimen ni sea cabecera, y falten fechas
    while (j < raw.length && j <= i + 3) {
      const next = raw[j];
      if (REGIMEN_WORD_RE.test(next.split(/\s+/)[0] ?? '')) break;
      if (/^(r[eé]gimen|empresa|situaci|fecha|datos|informe|notas|p[aá]gina|referencias)/i.test(next)) {
        break;
      }
      const datesSoFar = merged.match(DATE_RE)?.length ?? 0;
      const datesNext = next.match(DATE_RE)?.length ?? 0;
      if (datesSoFar >= 2 && datesNext === 0 && !/^\d/.test(next) && next.length < 80) {
        // continuación del nombre de empresa
        merged = `${merged} ${next}`;
        j++;
        continue;
      }
      if (datesSoFar < 2 && (datesNext > 0 || /^[A-ZÁÉÍÓÚÑ0-9]/.test(next))) {
        merged = `${merged} ${next}`;
        j++;
        continue;
      }
      break;
    }

    out.push(merged);
  }

  return out;
}

/**
 * Parsea una fila de situaciones del informe oficial.
 * GENERAL 28271425491 KOBE RODRIGUEZ DANIEL 03.07.2025 03.07.2025 18.07.2025 100 --- 05 16
 */
export function parseVidaLaboralPeriodLine(line: string): PeriodoLaboral | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 10) return null;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  const regimenWord = tokens[0];
  if (!REGIMEN_WORD_RE.test(regimenWord)) {
    // Layout alternativo con código 0111 + fechas DD/MM/YYYY
    return parseLegacyCodeLine(trimmed);
  }

  const regimen = regimenLabel(regimenWord);
  let idx = 1;

  let ccc: string | null = null;
  if (tokens[idx] && (/^\d{11,15}$/.test(tokens[idx]) || OPEN_CCC.test(tokens[idx]))) {
    ccc = OPEN_CCC.test(tokens[idx]) ? null : tokens[idx];
    idx++;
  }

  // Fechas: localizar índices
  const dateIdxs: number[] = [];
  for (let i = idx; i < tokens.length; i++) {
    if (/^\d{2}[./]\d{2}[./]\d{4}$/.test(tokens[i])) dateIdxs.push(i);
  }
  if (dateIdxs.length < 1) return null;

  const firstDateIdx = dateIdxs[0];
  const empresaTokens = tokens.slice(idx, firstDateIdx);
  let empresa = cleanEmpresa(empresaTokens.join(' '));

  const fechaAlta = toSlashDate(tokens[dateIdxs[0]]);
  // Columnas oficiales: Alta | Efecto alta | Baja. Baja abierta = "---" (solo 2 fechas).
  let fechaBaja: string | null = null;
  if (dateIdxs.length >= 3) {
    fechaBaja = toSlashDate(tokens[dateIdxs[2]]);
  } else if (dateIdxs.length === 2) {
    const afterSecond = tokens[dateIdxs[1] + 1] ?? '';
    // Sigue de alta: dos fechas (alta+efecto) y placeholder "---"
    if (afterSecond === '---' || OPEN_CCC.test(afterSecond)) {
      fechaBaja = null;
    } else {
      // Layout raro sin columna de efecto: 2ª fecha = baja solo si difiere
      const d0 = tokens[dateIdxs[0]];
      const d1 = tokens[dateIdxs[1]];
      fechaBaja = d0 !== d1 ? toSlashDate(d1) : null;
    }
  }

  if (!fechaAlta) return null;

  // Cola tras la última fecha: C.T. CTP G.C. DÍAS
  const afterDates = tokens.slice(dateIdxs[dateIdxs.length - 1] + 1);
  let diasCotizados: number | null = null;
  let grupoCotizacion: string | null = null;

  if (afterDates.length > 0) {
    // Último token numérico = días (puede ser 8.926)
    for (let i = afterDates.length - 1; i >= 0; i--) {
      const d = parseDiasToken(afterDates[i]);
      if (d != null) {
        diasCotizados = d;
        // G.C. suele ser el token anterior si es 01-11 o --
        const prev = afterDates[i - 1];
        if (prev && /^(0?[1-9]|1[01]|--)$/.test(prev) && prev !== '---') {
          grupoCotizacion = prev === '--' ? null : prev.padStart(2, '0');
        }
        break;
      }
    }
  }

  if (regimen === 'autonomos' && (!empresa || empresa.length < 3)) {
    empresa = empresa ?? 'Autónomo';
  }

  const tipo = classifyTipo(regimen, empresa, ccc);

  if (!empresa && !ccc && diasCotizados == null) return null;

  return {
    fechaAlta,
    fechaBaja,
    empresa: empresa ?? (tipo === 'autonomo' ? 'Autónomo' : null),
    ccc,
    regimen,
    situacion: fechaBaja ? 'BAJA' : 'ALTA',
    grupoCotizacion,
    diasCotizados,
    tipo,
  };
}

/** Formato antiguo/alternativo: 0111 28/123… EMPRESA 01/03/2018 … */
function parseLegacyCodeLine(trimmed: string): PeriodoLaboral | null {
  const codeMatch = trimmed.match(/\b(0[1-9]\d{2})\b/);
  if (!codeMatch) return null;

  const dates = [...trimmed.matchAll(/(\d{2}\/\d{2}\/\d{4}|--\/--\/----)/g)].map((m) => m[1]);
  if (dates.length < 1) return null;

  const fechaAlta = dates[0] === '--/--/----' ? null : dates[0];
  if (!fechaAlta) return null;

  let fechaBaja: string | null = null;
  if (dates.length >= 4) {
    fechaBaja = dates[2] === '--/--/----' ? null : dates[2];
  } else if (dates.length >= 2) {
    fechaBaja = dates[1] === '--/--/----' ? null : dates[1];
  }

  const cccMatch = trimmed.match(/\b(\d{2}\/\d{7,11}|\d{11,15})\b/);
  const ccc = cccMatch?.[1] ?? null;
  const code = codeMatch[1];
  const regimen =
    code === '0521' || code === '0825' ? 'autonomos' : code === '0163' ? 'hogar' : 'general';

  let empresaRaw = trimmed
    .replace(/\b0[1-9]\d{2}\b/, ' ')
    .replace(/\d{2}\/\d{2}\/\d{4}|--\/--\/----/g, ' ')
    .replace(/\b(\d{2}\/\d{7,11}|\d{11,15})\b/, ' ')
    .replace(/\b\d{1,5}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const empresa = cleanEmpresa(empresaRaw);
  const tipo: PeriodoLaboral['tipo'] =
    regimen === 'autonomos' ? 'autonomo' : empresa && ASIMILADA_HINT.test(empresa) ? 'otro' : 'contrato';

  const diasMatch = trimmed.match(/\s(\d{1,5})\s*$/);
  const diasCotizados = diasMatch ? Number(diasMatch[1]) : null;

  return {
    fechaAlta,
    fechaBaja,
    empresa: empresa ?? (tipo === 'autonomo' ? 'Autónomo' : null),
    ccc,
    regimen,
    situacion: fechaBaja ? 'BAJA' : 'ALTA',
    grupoCotizacion: null,
    diasCotizados,
    tipo,
  };
}

function periodoKey(p: PeriodoLaboral): string {
  return [p.fechaAlta, p.fechaBaja, p.empresa, p.ccc, p.regimen, p.tipo]
    .join('|')
    .toLowerCase();
}

function isDesempleoPeriod(p: PeriodoLaboral): boolean {
  return /desempleo|paro|subsidio|sepe/i.test(p.empresa ?? '');
}

/** Extrae todos los periodos del texto OCR/PDF de una vida laboral. */
export function parseVidaLaboralPeriodosFromText(text: string): ParsedVidaLaboralPeriodos {
  const periodosContrato: PeriodoLaboral[] = [];
  const periodosAutonomo: PeriodoLaboral[] = [];
  const situacionesAsimiladas: PeriodoLaboral[] = [];
  const prestacionesDesempleo: PrestacionDesempleo[] = [];
  const seen = new Set<string>();

  if (!text?.trim()) {
    return { periodosContrato, periodosAutonomo, situacionesAsimiladas, prestacionesDesempleo };
  }

  // Preferir bloque de situaciones; si no, todo el texto
  const sitIdx = text.search(/SITUACI[OÓ]N\/?ES|INFORME DE VIDA LABORAL\s*-\s*SITUACIONES/i);
  const slice = sitIdx >= 0 ? text.slice(sitIdx) : text;
  // Cortar notas aclaratorias
  const notesIdx = slice.search(/\nNotas aclaratorias\b/i);
  const body = notesIdx >= 0 ? slice.slice(0, notesIdx) : slice;

  const candidates = flattenSituacionLines(body);

  // También líneas sueltas (por si flatten falla)
  for (const line of body.split(/\r?\n/)) {
    if (REGIMEN_WORD_RE.test(line.trim().split(/\s+/)[0] ?? '')) {
      candidates.push(line.trim());
    }
  }

  for (const line of candidates) {
    const p = parseVidaLaboralPeriodLine(line);
    if (!p) continue;
    const key = periodoKey(p);
    if (seen.has(key)) continue;
    seen.add(key);

    if (isDesempleoPeriod(p)) {
      prestacionesDesempleo.push({
        tipo: p.empresa,
        fechaInicio: p.fechaAlta,
        fechaFin: p.fechaBaja,
        dias: p.diasCotizados,
        situacion: p.situacion,
        observaciones: p.regimen,
      });
      situacionesAsimiladas.push({ ...p, tipo: 'otro' });
      continue;
    }

    if (p.tipo === 'autonomo') {
      periodosAutonomo.push(p);
    } else if (p.tipo === 'otro') {
      situacionesAsimiladas.push(p);
    } else {
      periodosContrato.push(p);
    }
  }

  const byAlta = (a: PeriodoLaboral, b: PeriodoLaboral) => {
    const parse = (s: string | null) => {
      if (!s) return 0;
      const [d, m, y] = s.split('/').map(Number);
      return y * 10000 + m * 100 + d;
    };
    return parse(a.fechaAlta) - parse(b.fechaAlta);
  };

  periodosContrato.sort(byAlta);
  periodosAutonomo.sort(byAlta);
  situacionesAsimiladas.sort(byAlta);

  return { periodosContrato, periodosAutonomo, situacionesAsimiladas, prestacionesDesempleo };
}

function extractIdentityFromNarrative(text: string): {
  nombre: string | null;
  dni: string | null;
  naf: string | null;
  fechaNacimiento: string | null;
  direccion: string | null;
} {
  let nombre: string | null = null;
  let dni: string | null = null;
  let naf: string | null = null;
  let fechaNacimiento: string | null = null;
  let direccion: string | null = null;

  // D/Dª NOMBRE , nacido/a el 2 de agosto de 1967
  const narrative = text.match(
    /D\/D[ªa]\s+([A-ZÁÉÍÓÚÑ\s,'-]+?)\s*,\s*nacido\/a\s+el\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i
  );
  if (narrative) {
    nombre = cleanPersonName(narrative[1]);
    fechaNacimiento = spanishLongDateToDmy(narrative[2], narrative[3], narrative[4]);
  }

  const nafMatch = text.match(
    /N[uú]mero\s+de\s+la\s+Seguridad\s+Social\s+(\d{10,12})|N[º°]?\s*SEGURIDAD\s+SOCIAL[^\d]*(\d{10,12})/i
  );
  naf = nafMatch?.[1] ?? nafMatch?.[2] ?? text.match(/\b(2[89]\d{9,10})\b/)?.[1] ?? null;

  // D.N.I. 007534307J (puede llevar cero a la izquierda)
  const dniMatch = text.match(
    /D\.?\s*N\.?\s*I\.?\s*\.?\s*([0-9]{8,9}[A-HJ-NP-TV-Z])/i
  );
  if (dniMatch) {
    let d = dniMatch[1].toUpperCase();
    if (/^0\d{8}[A-Z]$/.test(d)) d = d.slice(1); // 007534307J → 07534307J
    dni = d;
  }

  // Bloque tabla identificativos
  const table = text.match(
    /NOMBRE Y APELLIDOS[^\n]*\n([A-ZÁÉÍÓÚÑ\s,'-]+?)\s+(\d{10,12})\s+D\.?\s*N\.?\s*I\.?\s*\.?\s*([0-9]{8,9}[A-HJ-NP-TV-Z])/i
  );
  if (table) {
    nombre = cleanPersonName(table[1]) ?? nombre;
    naf = table[2] ?? naf;
    let d = table[3].toUpperCase();
    if (/^0\d{8}[A-Z]$/.test(d)) d = d.slice(1);
    dni = d;
  }

  const dom = text.match(/domicilio\s+en\s+([\s\S]+?)(?=\nha figurado|\nPresenta|\nDATOS)/i);
  if (dom) direccion = dom[1].replace(/\s+/g, ' ').trim();

  return { nombre, dni, naf, fechaNacimiento, direccion };
}

function spanishLongDateToDmy(day: string, monthWord: string, year: string): string | null {
  const months: Record<string, string> = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    setiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12',
  };
  const m = months[monthWord.toLowerCase()];
  if (!m) return null;
  return `${day.padStart(2, '0')}/${m}/${year}`;
}

export interface VidaLaboralDayTotals {
  /** Días efectivamente computables (pensión / prestaciones). */
  diasComputables: number | null;
  anosComputables: number | null;
  mesesComputables: number | null;
  diasRestantesComputables: number | null;
  /** Tiempo total en alta (incluye solapes). */
  diasAltaTotal: number | null;
  anosAltaTotal: number | null;
  /** Días en pluriempleo / pluriactividad (alta − computables). */
  diasPluriempleo: number | null;
}

/**
 * Extrae ambos totales del informe TGSS.
 * Para jubilación SIEMPRE usar el bloque «efectivamente computables»,
 * no el total de días en alta (que incluye pluriempleo/pluriactividad).
 */
export function extractVidaLaboralDayTotals(text: string): VidaLaboralDayTotals {
  const empty: VidaLaboralDayTotals = {
    diasComputables: null,
    anosComputables: null,
    mesesComputables: null,
    diasRestantesComputables: null,
    diasAltaTotal: null,
    anosAltaTotal: null,
    diasPluriempleo: null,
  };
  if (!text?.trim()) return empty;

  // …efectivamente computables… es de / 32 Años / 11.692 días 0 meses / 5 días
  const computable = text.match(
    /d[ií]as\s+efectivamente\s+computables[\s\S]{0,320}?(\d{1,2})\s*A[nñ]os[\s\S]{0,120}?(\d{1,2}\.\d{3}|\d{4,5})\s*d[ií]as(?:\s+(\d{1,2})\s*meses)?(?:\s+(\d{1,2})\s*d[ií]as)?/i
  );

  // ha figurado … alta … durante un total de / 34 Años / 12.574 días …
  const alta = text.match(
    /situaci[oó]n\s+de\s+alta[\s\S]{0,200}?durante un total de[\s\S]{0,80}?(\d{1,2})\s*A[nñ]os[\s\S]{0,120}?(\d{1,2}\.\d{3}|\d{4,5})\s*d[ií]as/i
  );

  const pluri = text.match(
    /(?:pluriempleo|pluriactividad)[\s\S]{0,220}?durante un total de\s+(\d{1,2}\.\d{3}|\d{1,5})\s*d[ií]as/i
  );

  const diasComputables = computable ? parseDiasToken(computable[2]) : null;
  const diasAltaTotal = alta ? parseDiasToken(alta[2]) : null;
  let diasPluriempleo = pluri ? parseDiasToken(pluri[1]) : null;
  if (
    diasPluriempleo == null &&
    diasAltaTotal != null &&
    diasComputables != null &&
    diasAltaTotal > diasComputables
  ) {
    diasPluriempleo = diasAltaTotal - diasComputables;
  }

  return {
    diasComputables,
    anosComputables: computable ? Number(computable[1]) : null,
    mesesComputables: computable?.[3] != null ? Number(computable[3]) : null,
    diasRestantesComputables: computable?.[4] != null ? Number(computable[4]) : null,
    diasAltaTotal,
    anosAltaTotal: alta ? Number(alta[1]) : null,
    diasPluriempleo,
  };
}

function extractComputableDays(text: string): number | null {
  const totals = extractVidaLaboralDayTotals(text);
  if (totals.diasComputables != null) return totals.diasComputables;

  // Fallback legado: primera cifra grande de días tras «durante un total»
  const narrative = text.match(
    /durante un total de[\s\S]{0,80}?(\d{1,2}\.\d{3}|\d{4,5})\s*d[ií]as/i
  );
  if (narrative) {
    const n = parseDiasToken(narrative[1]);
    if (n) return n;
  }

  return null;
}

/** Construye un informe parcial solo desde texto (identidad + periodos). */
export function parseVidaLaboralFromText(
  text: string,
  documentType = 'vida_laboral'
): Pick<
  VidaLaboralCompleta,
  | 'identificacion'
  | 'resumen'
  | 'periodosContrato'
  | 'periodosAutonomo'
  | 'situacionesAsimiladas'
  | 'prestacionesDesempleo'
> {
  void documentType;
  const ss = parseSegSocialDocument(text);
  const narrative = extractIdentityFromNarrative(text);
  const periodos = parseVidaLaboralPeriodosFromText(text);

  const totals = extractVidaLaboralDayTotals(text);
  // Jubilación / prestaciones = días COMPUTABLES (nunca el total en alta)
  const dias =
    totals.diasComputables ?? extractComputableDays(text) ?? ss.diasCotizados ?? null;

  let anos = totals.anosComputables;
  let meses = totals.mesesComputables;
  let diasRestantes = totals.diasRestantesComputables;

  if (dias != null && (anos == null || meses == null)) {
    anos = Math.floor(dias / 365.25);
    meses = Math.round((dias % 365.25) / 30.4375);
    if (meses >= 12) {
      anos += Math.floor(meses / 12);
      meses = meses % 12;
    }
  }
  // No usar «durante un total de N Años» del bloque de ALTA (infla por pluriempleo).

  // Régimen principal por volumen de periodos (no por la 1ª mención AUTONOMO del PDF)
  const regimenPrincipal =
    periodos.periodosContrato.length === 0 && periodos.periodosAutonomo.length > 0
      ? 'autonomos'
      : periodos.periodosContrato.length > 0
        ? 'general'
        : ss.regimen ?? null;

  const fechaNac = narrative.fechaNacimiento ?? ss.fechaNacimiento;

  return {
    identificacion: {
      nombre: narrative.nombre ?? ss.nombre,
      dni: narrative.dni ?? ss.dni,
      nie: null,
      numeroAfiliacion: narrative.naf ?? ss.naf,
      fechaNacimiento: fechaNac,
      edad: computeAge(fechaNac),
      direccion: narrative.direccion,
      localidad: null,
      provincia: null,
      codigoPostal: narrative.direccion?.match(/\b(\d{5})\b/)?.[1] ?? null,
    },
    resumen: {
      totalDiasCotizacion: dias,
      anosCotizados: anos,
      mesesCotizados: meses,
      diasRestantes,
      regimenPrincipal,
      situacionActual: /situaci[oó]n\s*actual[^\n]*alta/i.test(text)
        ? 'ALTA'
        : periodos.periodosContrato.some((p) => !p.fechaBaja) ||
            periodos.periodosAutonomo.some((p) => !p.fechaBaja)
          ? 'ALTA'
          : null,
      fechaInforme:
        text.match(/al d[ií]a\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i)
          ? (() => {
              const m = text.match(/al d[ií]a\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i)!;
              return spanishLongDateToDmy(m[1], m[2], m[3]);
            })()
          : text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] ?? null,
      diasAltaTotal: totals.diasAltaTotal,
      diasPluriempleo: totals.diasPluriempleo,
    },
    ...periodos,
  };
}
