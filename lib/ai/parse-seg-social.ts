/** Parser para informes oficiales de la Seguridad Social (vida laboral, bases). */

const LABEL_PATTERNS = {
  nombre: [
    /apellidos\s*(?:y|,)\s*nombre/i,
    /nombre\s*(?:y|,)\s*apellidos/i,
  ],
  dni: [/documento\s*identificativo/i, /\bn\.?\s*i\.?\s*f\.?\b/i, /\bd\.?\s*n\.?\s*i\.?\b/i],
  nacimiento: [/fecha\s*(?:de\s*)?nacimiento/i, /\bf\.?\s*nac/i],
  afiliacion: [/n[º°]?\s*afiliaci[oó]n/i, /n[uú]mero\s*(?:de\s*)?afiliaci[oó]n/i],
  empresa: [/raz[oó]n\s*social/i, /nombre\s*(?:de\s*)?(?:la\s*)?empresa/i],
};

const DNI_PATTERN =
  /\b(?:D\.?\s*N\.?\s*I\.?\s*\.?\s*)?([0-9]{8}[A-HJ-NP-TV-Z]|[XYZxyz][0-9]{7}[A-HJ-NP-TV-Z])\b/i;

function lines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function parseSpanishNumber(raw: string): number | null {
  const n = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) || n <= 0 ? null : n;
}

function isLabelLine(line: string): boolean {
  if (line.length > 100) return true;
  return (
    /^(datos|informe|p[aá]gina|documento|n[º°]|fecha|n[uú]mero|total|resumen|periodo|r[eé]gimen|situaci|cotizaci|cualquier duda)/i.test(
      line
    ) ||
    /seguridad social|\(\*\)|^--/i.test(line) ||
    /^(alta|baja|aut[oó]nomo|general)$/i.test(line)
  );
}

function looksLikeCleanName(value: string): boolean {
  if (!value || value.length < 3 || value.length > 55) return false;
  if (/\d/.test(value)) return false;
  if (/identificativo|afiliaci|nacimiento|seguridad social|documento|n[º°]|\bD\.?\s*N\.?\s*I/i.test(value))
    return false;
  return /^[A-ZÁÉÍÓÚÑa-záéíóúñ\s,'-]+$/i.test(value);
}

function looksLikeDni(value: string): boolean {
  const clean = value.replace(/[\s.-]/g, '').toUpperCase();
  return /^[0-9]{8}[A-HJ-NP-TV-Z]$/.test(clean) || /^[XYZ][0-9]{7}[A-HJ-NP-TV-Z]$/.test(clean);
}

/** Separa nombre, DNI y Nº afiliación cuando vienen en la misma línea del PDF. */
export function splitIdentityLine(line: string): {
  nombre: string | null;
  dni: string | null;
  naf: string | null;
} {
  let work = line.trim();
  if (!work) return { nombre: null, dni: null, naf: null };

  const dniMatch = work.match(DNI_PATTERN);
  let dni = dniMatch?.[1]?.toUpperCase().replace(/[\s.-]/g, '') ?? null;
  if (dni && /^[0-9]{9}[A-HJ-NP-TV-Z]$/.test(dni)) dni = dni.slice(1);

  const nafMatch = work.match(/\b(2[89]\d{9,10})\b/);
  const naf = nafMatch?.[1] ?? null;

  work = work.replace(/\bD\.?\s*N\.?\s*I\.?\s*\.?\s*[0-9XYZxyz][0-9]{7,8}[A-HJ-NP-TV-Z]/gi, ' ');
  work = work.replace(/\bN\.?\s*I\.?\s*E\.?\s*\.?\s*[XYZxyz][0-9]{7}[A-HJ-NP-TV-Z]/gi, ' ');
  if (naf) work = work.replace(naf, ' ');
  work = work.replace(/\b\d{10,12}\b/g, ' ');
  work = work.replace(/\s+/g, ' ').trim();

  const nombre = looksLikeCleanName(work) ? work : null;
  return { nombre, dni, naf };
}

export function cleanPersonName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const { nombre } = splitIdentityLine(trimmed);
  if (nombre) return nombre;

  if (looksLikeCleanName(trimmed)) return trimmed;
  return null;
}

export function extractLineValue(text: string, labelPatterns: RegExp[]): string | null {
  const ls = lines(text);

  for (let i = 0; i < ls.length; i++) {
    for (const pat of labelPatterns) {
      if (!pat.test(ls[i])) continue;

      const sameLine = ls[i].split(/[:：]/).slice(1).join(':').trim();
      if (sameLine && sameLine.length > 1 && !pat.test(sameLine) && !isLabelLine(sameLine)) {
        return sameLine;
      }

      for (let j = i + 1; j < Math.min(i + 5, ls.length); j++) {
        const candidate = ls[j];
        if (isLabelLine(candidate)) continue;
        if (candidate.length >= 2) return candidate;
      }
    }
  }

  return null;
}

export function extractSpanishNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const n = parseSpanishNumber(match[1]);
      if (n != null) return n;
    }
  }
  return null;
}

/** Toma el mayor total de días de cotización (evita periodos parciales de 5 meses, etc.). */
function extractTotalDiasCotizacion(text: string): number | null {
  const pattern =
    /total\s*(?:de\s*)?d[ií]as\s*(?:de\s*)?cotizaci[oó]n[^\d\n]{0,40}(\d[\d.,]*)/gi;
  let max = 0;

  for (const match of text.matchAll(pattern)) {
    const n = parseSpanishNumber(match[1]);
    if (n != null && n > max && n <= 45000) max = n;
  }

  if (max > 0) return max;

  const resumenIdx = text.search(/resumen\s*(?:de\s*)?(?:periodos|situaciones)/i);
  const slice = resumenIdx >= 0 ? text.slice(resumenIdx) : text;
  const fallback = extractSpanishNumber(slice, [
    /(\d{1,3}(?:\.\d{3})+)\s*(?:d[ií]as|$)/i,
  ]);
  return fallback && fallback > 100 ? fallback : null;
}

function diasToAnosMeses(dias: number): { anos: number; meses: number } {
  const anos = Math.floor(dias / 365.25);
  const restoDias = dias - anos * 365.25;
  let meses = Math.round(restoDias / 30.4375);
  if (meses >= 12) {
    return { anos: anos + Math.floor(meses / 12), meses: meses % 12 };
  }
  return { anos, meses };
}

function parseIdentificativosBlock(text: string): {
  nombre: string | null;
  dni: string | null;
  naf: string | null;
  fechaNacimiento: string | null;
} {
  const ls = lines(text);
  const idx = ls.findIndex((l) => /datos identificativos/i.test(l));
  if (idx < 0) {
    return { nombre: null, dni: null, naf: null, fechaNacimiento: null };
  }

  let nombre: string | null = null;
  let dni: string | null = null;
  let naf: string | null = null;
  let fechaNacimiento: string | null = null;

  for (let j = idx + 1; j < Math.min(idx + 20, ls.length); j++) {
    const line = ls[j];
    if (/^resumen|^periodos|^situaciones|^r[eé]gimen/i.test(line)) break;

    const split = splitIdentityLine(line);
    if (!nombre && split.nombre) nombre = split.nombre;
    if (!dni && split.dni) dni = split.dni;
    if (!naf && split.naf) naf = split.naf;

    if (!dni && looksLikeDni(line)) dni = line.replace(/[\s.-]/g, '').toUpperCase();

    const fechaMatch = line.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
    if (!fechaNacimiento && fechaMatch && /nacimiento|fecha/i.test(ls[j - 1] ?? line)) {
      fechaNacimiento = fechaMatch[1];
    }

    if (/fecha\s*(?:de\s*)?nacimiento/i.test(line)) {
      const next = ls[j + 1]?.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
      if (next) fechaNacimiento = next[1];
    }

    if (/apellidos\s*(?:y|,)\s*nombre/i.test(line)) {
      const next = ls[j + 1];
      if (next) {
        const parsed = splitIdentityLine(next);
        if (parsed.nombre) nombre = parsed.nombre;
        if (parsed.dni) dni = parsed.dni;
        if (parsed.naf) naf = parsed.naf;
      }
    }
  }

  return { nombre, dni, naf, fechaNacimiento };
}

export function parseSegSocialDocument(text: string): {
  nombre: string | null;
  fechaNacimiento: string | null;
  dni: string | null;
  naf: string | null;
  empresa: string | null;
  anosCotizados: number | null;
  mesesCotizados: number | null;
  diasCotizados: number | null;
  baseMensual: number | null;
  regimen: string | null;
} {
  const block = parseIdentificativosBlock(text);

  let nombre = block.nombre;
  if (!nombre) {
    const raw = extractLineValue(text, LABEL_PATTERNS.nombre);
    nombre = raw ? cleanPersonName(raw) : null;
  }

  let dni = block.dni;
  if (!dni) {
    const dniRaw = extractLineValue(text, LABEL_PATTERNS.dni);
    dni = dniRaw && looksLikeDni(dniRaw) ? dniRaw.replace(/[\s.-]/g, '').toUpperCase() : null;
  }
  if (!dni) {
    const m = text.match(DNI_PATTERN);
    dni = m?.[1]?.toUpperCase().replace(/[\s.-]/g, '') ?? null;
  }

  const naf = block.naf ?? text.match(/\b(2[89]\d{9,10})\b/)?.[1] ?? null;

  let fechaNacimiento = block.fechaNacimiento;
  if (!fechaNacimiento) {
    fechaNacimiento =
      extractLineValue(text, LABEL_PATTERNS.nacimiento)?.match(/\d{2}[\/\-]\d{2}[\/\-]\d{4}/)?.[0] ??
      null;
  }
  if (!fechaNacimiento) {
    fechaNacimiento =
      text.match(/fecha\s*(?:de\s*)?nacimiento[^\d]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i)?.[1] ?? null;
  }

  let empresa = extractLineValue(text, LABEL_PATTERNS.empresa);
  if (empresa && isGarbageCompany(empresa)) empresa = null;

  const diasCotizados = extractTotalDiasCotizacion(text);

  let anosCotizados = extractSpanishNumber(text, [
    /total\s*(?:de\s*)?a[nñ]os\s*(?:de\s*)?cotizaci[oó]n[^\d\n]*(\d[\d.,]*)/i,
    /a[nñ]os\s*(?:de\s*)?cotizaci[oó]n[^\d\n]*(\d[\d.,]*)/i,
  ]);

  let mesesCotizados: number | null = null;

  if (diasCotizados) {
    const converted = diasToAnosMeses(diasCotizados);
    if (!anosCotizados || converted.anos > anosCotizados) {
      anosCotizados = converted.anos;
      mesesCotizados = converted.meses;
    }
  }

  const baseMensual = extractSpanishNumber(text, [
    /[uú]ltima\s*base\s*(?:de\s*)?cotizaci[oó]n[^\d\n]{0,20}(\d[\d.,]+)/i,
    /base\s*(?:de\s*)?cotizaci[oó]n\s*(?:mensual|actual)?[^\d\n]{0,20}(\d[\d.,]+)/i,
  ]);

  const regimen =
    /trabajadores aut[oó]nomos|r[eé]gimen especial.*aut[oó]nom|\breta\b/i.test(text)
      ? 'autonomos'
      : /r[eé]gimen general|regimen general/i.test(text)
        ? 'general'
        : /aut[oó]nom|autonom/i.test(text)
          ? 'autonomos'
          : /agrario/i.test(text)
            ? 'agrario'
            : null;

  return {
    nombre: cleanPersonName(nombre),
    fechaNacimiento,
    dni,
    naf,
    empresa,
    anosCotizados,
    mesesCotizados,
    diasCotizados,
    baseMensual,
    regimen,
  };
}

export function isGarbageCompany(value: string): boolean {
  return (
    /situaci[oó]n asimilada|fecha alta|grupo de categor|profesional|\(\*\)|^alta$|^baja$/i.test(
      value
    ) || value.length > 120
  );
}

export function computeAge(fechaNacimiento: string | null): number | null {
  if (!fechaNacimiento) return null;
  const m = fechaNacimiento.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!m) return null;
  const birth = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
  return age > 0 && age < 120 ? age : null;
}

export function formatCotizacionLabel(
  anos: number | null | undefined,
  meses: number | null | undefined
): string {
  if (anos == null && meses == null) return '—';
  if (anos != null && meses != null && meses > 0) return `${anos} años y ${meses} meses`;
  if (anos != null) return `${anos} años`;
  if (meses != null) return `${meses} meses`;
  return '—';
}
