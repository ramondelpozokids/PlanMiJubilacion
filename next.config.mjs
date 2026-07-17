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

/** Cabeceras de seguridad (capas de protección del navegador). */
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com https://eu.i.posthog.com https://*.posthog.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.openai.com https://api.openai.com https://*.posthog.com https://eu.i.posthog.com https://*.sentry.io https://vercel.live https://*.vercel.app",
      "worker-src 'self' blob:",
      'upgrade-insecure-requests',
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    serverComponentsExternalPackages: [
      'pdf-parse',
      'pdfjs-dist',
      '@napi-rs/canvas',
      '@google-cloud/documentai',
    ],
    // Next 14: tracing includes va dentro de experimental
    outputFileTracingIncludes: {
      '/api/documents/process': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/canvas/**/*',
      ],
      '/upload': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/canvas/**/*',
      ],
      '/analysis': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/canvas/**/*',
      ],
      '/asesoria': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/canvas/**/*',
      ],
      '/asesoria/consultas': [
        './node_modules/pdf-parse/**/*',
        './node_modules/pdfjs-dist/**/*',
        './node_modules/@napi-rs/canvas/**/*',
      ],
    },
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
        headers: SECURITY_HEADERS,
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
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
