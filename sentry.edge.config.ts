import * as Sentry from '@sentry/nextjs';

// Solo inicializar si hay DSN — evita tumbar Edge middleware sin config
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
  });
}
