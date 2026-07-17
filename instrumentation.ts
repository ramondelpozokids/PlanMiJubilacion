export async function register() {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      // Solo si hay DSN; no bloquear Edge/middleware sin Sentry
      if (process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) {
        await import('./sentry.edge.config');
      }
    }
  } catch (err) {
    console.error('instrumentation register failed:', err);
  }
}
