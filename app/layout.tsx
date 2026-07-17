import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { Toaster } from 'sonner';
import { CSPostHogProvider } from '@/components/providers/posthog-provider';
import { getSiteUrl } from '@/lib/seo/site';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PlanMiJubilación — Ecosistema PlanMi | Planifica tu jubilación',
    template: '%s | PlanMiJubilación',
  },
  description:
    'Ecosistema PlanMi: planifica tu jubilación, prestaciones y vida laboral sobre un mismo expediente digital. Simulaciones orientativas con IA. Fundador: Ramón del Pozo Rott.',
  keywords: [
    'jubilación España',
    'pensión Seguridad Social',
    'vida laboral',
    'planificar jubilación',
    'cotizaciones internacionales',
    'subsidio mayores 52',
    'PlanMiJubilación',
    'Ecosistema PlanMi',
    'expediente digital jubilación',
    'simulación pensión',
  ],
  authors: [{ name: 'Ramón del Pozo Rott' }, { name: 'PlanMiJubilación' }],
  creator: 'Ramón del Pozo Rott',
  publisher: 'PlanMiJubilación',
  category: 'finance',
  applicationName: 'PlanMiJubilación',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: siteUrl,
    siteName: 'PlanMiJubilación',
    title: 'PlanMiJubilación — Ecosistema PlanMi',
    description:
      'Plataforma integral de planificación social y financiera. Jubilación, prestaciones y vida laboral.',
    images: [
      {
        url: '/logo1.png',
        width: 1200,
        height: 630,
        alt: 'PlanMiJubilación',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlanMiJubilación — Ecosistema PlanMi',
    description: 'Planifica tu jubilación con un expediente digital seguro.',
    images: ['/logo1.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
    languages: { 'es-ES': siteUrl },
  },
  icons: {
    icon: [{ url: '/logo1.png', type: 'image/png' }],
    apple: [{ url: '/logo1.png', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  other: {
    'msapplication-TileColor': '#0f3d2e',
  },
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
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
            >
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
