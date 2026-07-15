import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';
import { CSPostHogProvider } from '@/components/providers/posthog-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://planmijubilacion.es'),
  title: {
    default: 'PlanMiJubilacion — Planifica tu jubilación con IA',
    template: '%s | PlanMiJubilacion',
  },
  description:
    'Asistente inteligente para planificar tu jubilación en España. Sube tu vida laboral y descubre cuánto cobrarás, cuándo jubilarte y cómo maximizar tu pensión.',
  keywords: [
    'jubilación',
    'pensión',
    'Seguridad Social',
    'vida laboral',
    'España',
    'autónomos',
    'planificación financiera',
  ],
  authors: [{ name: 'PlanMiJubilacion' }],
  creator: 'PlanMiJubilacion',
  publisher: 'PlanMiJubilacion S.L.',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://planmijubilacion.es',
    siteName: 'PlanMiJubilacion',
    title: 'PlanMiJubilacion — Planifica tu jubilación con IA',
    description: 'Sube tu vida laboral. La IA hace el resto.',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlanMiJubilacion',
    description: 'Planifica tu jubilación con IA en minutos',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: { canonical: 'https://planmijubilacion.es' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <CSPostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md">
              Saltar al contenido
            </a>
            {children}
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </CSPostHogProvider>
      </body>
    </html>
  );
}