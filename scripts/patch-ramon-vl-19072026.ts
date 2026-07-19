/**
 * Aplica los datos de VL del 19/07/2026 de Ramón (autoritativos del usuario).
 * Uso: npx tsx scripts/patch-ramon-vl-19072026.ts
 */
import fs from 'fs';
import path from 'path';
import { emptyExpediente, type ExpedienteDigital } from '../lib/expediente/types';
import { applyFounderIdentity } from '../lib/admin/founder-identity';
import { FOUNDER_LIFE_PATH } from '../lib/calculator/life-path';
import { buildRetirementOutlook } from '../lib/calculator/retirement-outlook';
import { resolveExpedienteAsOf } from '../lib/expediente/as-of';

function loadEnv() {
  const raw = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const i = line.indexOf('=');
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const SOURCE = {
  documentId: 'vl-19072026-patch',
  documentName: 'vida_laboral.pdf (19/07/2026)',
  documentType: 'vida_laboral' as const,
  extractedAt: new Date().toISOString(),
  confidence: 1,
};

function sv<T>(value: T) {
  return { value, sources: [SOURCE] };
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const uid = 'f0c66115-d1d3-489e-9a5f-fee6989f6a0c';
  const h = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  const rows = await (
    await fetch(`${url}/rest/v1/expedientes?select=data&user_id=eq.${uid}`, { headers: h })
  ).json();
  let exp: ExpedienteDigital = rows[0]?.data?.userId
    ? rows[0].data
    : emptyExpediente(uid);

  // Datos del usuario — VL emitida 19/07/2026
  exp.resumen.fechaInforme = sv('19/07/2026');
  exp.resumen.anosCotizados = sv(33);
  exp.resumen.mesesCotizados = sv(7);
  exp.resumen.diasRestantes = sv(1);
  exp.resumen.totalDiasCotizacion = sv(12266);
  // Alta − computables ≈ pluriempleo (si no hay dato nuevo, conservar o estimar)
  const altaPrev = Number(exp.resumen.diasAltaTotal?.value ?? 0);
  if (altaPrev > 12266) {
    exp.resumen.diasPluriempleo = sv(altaPrev - 12266);
  }

  applyFounderIdentity(exp);
  exp.updatedAt = new Date().toISOString();

  const patch = await fetch(`${url}/rest/v1/expedientes?user_id=eq.${uid}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({
      data: exp,
      completitud_score: exp.completitud?.score ?? 100,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!patch.ok) throw new Error(await patch.text());

  const asOf = resolveExpedienteAsOf(exp);
  const outlook = buildRetirementOutlook(exp, asOf, FOUNDER_LIFE_PATH);
  console.log(
    JSON.stringify(
      {
        ok: true,
        asOf: '19/07/2026',
        carrera: outlook?.carreraLabel,
        dias: 12266,
        missing: outlook?.ordinary.missingForAge65Label,
        careerComplete: outlook?.ordinary.careerCompleteDateLabel,
        ordinary: outlook?.ordinary.dateLabel,
        at65: outlook?.ordinary.at65IfCareer,
        explanation: outlook?.ordinary.explanation,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
