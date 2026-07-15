import { getOpenAiStatus, isOpenAiConfigured } from '@/lib/openai/env';

export function OpenAiConfigBanner() {
  const status = getOpenAiStatus();

  if (status.ok) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        OpenAI configurado. Si ves error <strong>429</strong>, la clave es válida pero no hay crédito:{' '}
        <a
          className="underline"
          href="https://platform.openai.com/settings/organization/billing"
          target="_blank"
          rel="noreferrer"
        >
          Añadir facturación / crédito
        </a>
        .
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
      <strong>OpenAI no configurado — lectura completa desactivada.</strong>
      <p className="mt-2 text-muted-foreground">{status.message}</p>
      <p className="mt-2 text-xs">
        Tras corregir .env.local: <code>Ctrl+C</code> → <code>npm run dev</code>
        {!isOpenAiConfigured() ? '' : ''}
      </p>
    </div>
  );
}
