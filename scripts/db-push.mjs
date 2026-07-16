/**
 * Aplica migraciones pendientes al proyecto Supabase remoto.
 * Requiere SUPABASE_DB_PASSWORD en .env.local (Settings → Database → password).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  console.error('Falta NEXT_PUBLIC_SUPABASE_URL en .env.local');
  process.exit(1);
}

const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!ref) {
  console.error('URL de Supabase no válida:', supabaseUrl);
  process.exit(1);
}

if (!dbPassword && !process.env.SUPABASE_DB_URL) {
  console.error(
    'Falta SUPABASE_DB_PASSWORD o SUPABASE_DB_URL en .env.local\n' +
      'Opción A: SUPABASE_DB_PASSWORD=... (solo la clave)\n' +
      'Opción B: copia la URI de Connect → Session pooler → SUPABASE_DB_URL=postgresql://...'
  );
  process.exit(1);
}

const encoded = dbPassword ? encodeURIComponent(dbPassword) : null;
const region = process.env.SUPABASE_POOLER_REGION ?? 'eu-central-1';

const poolerUrl =
  encoded &&
  `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
const directUrl =
  encoded && `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`;

/** Prioridad: SUPABASE_DB_URL (copiada del panel) > pooler > direct */
const dbUrl =
  process.env.SUPABASE_DB_URL ??
  (process.env.SUPABASE_DB_DIRECT === '1' ? directUrl : poolerUrl);

if (!dbUrl) {
  console.error('No se pudo construir URL de conexión.');
  process.exit(1);
}

const mode = process.env.SUPABASE_DB_URL
  ? 'custom URL'
  : process.env.SUPABASE_DB_DIRECT === '1'
    ? 'direct'
    : 'pooler';

console.log(`Aplicando migraciones a ${ref} (${mode})…`);

const result = spawnSync('npx', ['supabase', 'db push', '--db-url', dbUrl], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
if (result.status !== 0) {
  console.error(`
Si falla la conexión:
1. En Supabase → Connect → pestaña "Session pooler" → copia la URI completa.
2. En .env.local: SUPABASE_DB_URL=postgresql://postgres.${ref}:TU_PASSWORD@...
3. Vuelve a ejecutar: npm run db:push

Alternativa sin CLI: SQL Editor → pega supabase/migrations/007 y 008.
`);
  process.exit(result.status ?? 1);
}
