/** Validación de OPENAI_API_KEY — solo process.env (Next.js carga .env.local en servidor). */

const PLACEHOLDER_PATTERNS = [
  'tu_api_key',
  'your_api_key',
  'your-openai',
  'sk-xxxx',
  'sk-xxx',
  'changeme',
  'example',
  'placeholder',
];

function isPlaceholderKey(key: string): boolean {
  const lower = key.toLowerCase();
  return PLACEHOLDER_PATTERNS.some((p) => lower.includes(p));
}

export function getOpenAiApiKey(): string | undefined {
  const key = process.env.OPENAI_API_KEY?.trim() ?? '';
  if (!key || key.length < 20) return undefined;
  if (isPlaceholderKey(key)) return undefined;
  if (!key.startsWith('sk-')) return undefined;
  return key;
}

export function isOpenAiConfigured(): boolean {
  return Boolean(getOpenAiApiKey());
}

export function getOpenAiStatus(): { ok: boolean; message: string } {
  const raw = process.env.OPENAI_API_KEY?.trim() ?? '';

  if (!raw) {
    return {
      ok: false,
      message:
        'OPENAI_API_KEY no está en .env.local. Crea una en https://platform.openai.com/api-keys y añádela.',
    };
  }

  if (isPlaceholderKey(raw)) {
    return {
      ok: false,
      message:
        'OPENAI_API_KEY es un placeholder (TU_API_KEY). Pon tu clave sk-... en .env.local y reinicia npm run dev.',
    };
  }

  if (!getOpenAiApiKey()) {
    return {
      ok: false,
      message: `OPENAI_API_KEY inválida ("${raw.slice(0, 12)}…"). Debe empezar por sk-`,
    };
  }

  return { ok: true, message: 'OpenAI configurado' };
}

export function requireOpenAiApiKey(): string {
  const status = getOpenAiStatus();
  if (!status.ok) throw new Error(status.message);
  return getOpenAiApiKey()!;
}
