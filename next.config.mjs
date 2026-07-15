import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { withSentryConfig } from '@sentry/nextjs';

/**
 * Windows a menudo tiene OPENAI_API_KEY=TU_API_KEY en variables de sistema
 * y pisa .env.local. Forzamos la clave real de .env.local al arrancar Next.
 */
function forceOpenAiKeyFromEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), '.env.local');
    if (!existsSync(envPath)) return;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.startsWith('OPENAI_API_KEY=')) continue;
      const val = trimmed.slice('OPENAI_API_KEY='.length).trim();
      if (val.startsWith('sk-') && val.length > 20) {
        process.env.OPENAI_API_KEY = val;
      }
    }
  } catch {
    /* ignore */
  }
}

forceOpenAiKeyFromEnvLocal();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@google-cloud/documentai'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.openai.com https://*.posthog.com; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
