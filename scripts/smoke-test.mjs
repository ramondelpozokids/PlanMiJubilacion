/**
 * Verificación rápida antes de probar upload + expediente.
 * Uso: node scripts/smoke-test.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const path = resolve(root, '.env.local');
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    // .env.local tiene prioridad sobre variables del sistema (p. ej. TU_API_KEY en Windows)
    process.env[key] = val;
  }
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
}

loadEnvLocal();

console.log('\n=== PlanMiJubilacion — smoke test ===\n');

let errors = 0;

// OpenAI
const openai = process.env.OPENAI_API_KEY?.trim() ?? '';
if (!openai) {
  fail('OPENAI_API_KEY vacía');
  errors++;
} else if (openai.toLowerCase().includes('tu_api_key')) {
  fail('OPENAI_API_KEY es placeholder TU_API_KEY (revisa variables Windows)');
  errors++;
} else if (!openai.startsWith('sk-')) {
  fail('OPENAI_API_KEY no empieza por sk-');
  errors++;
} else {
  ok(`OpenAI configurada (${openai.slice(0, 8)}…)`);
}

// Supabase
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  fail('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  errors++;
  process.exit(1);
}

ok(`Supabase URL: ${url}`);

const checks = [
  { table: 'documents', label: 'Tabla documents' },
  { table: 'expedientes', label: 'Tabla expedientes (migración 004)' },
  { table: 'extracted_data', label: 'Tabla extracted_data' },
  { table: 'profiles', label: 'Tabla profiles' },
];

async function checkTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    return { ok: false, message: body.slice(0, 200) || res.statusText };
  }
  return { ok: true };
}

async function countTable(table) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const range = res.headers.get('content-range');
  if (!range) return null;
  const m = range.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

for (const { table, label } of checks) {
  const result = await checkTable(table);
  if (!result.ok) {
    fail(`${label}: ${result.message}`);
    errors++;
  } else {
    ok(label);
  }
}

const docCount = await countTable('documents');
const expCount = await countTable('expedientes');

console.log(`\n  Documentos en BD: ${docCount ?? '?'}`);
console.log(`  Expedientes en BD: ${expCount ?? '?'}`);

const stuckRes = await fetch(
  `${url}/rest/v1/documents?select=id,name,ocr_status&ocr_status=eq.processing`,
  {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  }
);
const processing = stuckRes.ok ? await stuckRes.json() : [];

if (processing?.length) {
  console.log(`\n  ⚠ ${processing.length} documento(s) atascados en "processing":`);
  for (const d of processing) console.log(`    - ${d.name} (${d.id})`);
}

console.log('\n--- Resultado ---');
if (errors === 0) {
  console.log('Todo OK. Arranca npm run dev y prueba en http://localhost:3000/upload\n');
} else {
  console.log(`${errors} error(es). Corrige antes de probar.\n`);
  process.exit(1);
}
