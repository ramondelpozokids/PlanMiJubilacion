import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { SiteFooter } from '@/components/layout/site-footer';
import { getUser } from '@/lib/supabase/server';
import { PlanMiSuite } from '@/components/features/planmi-suite';
import { PricingTable } from '@/components/features/pricing-table';
import { PLANMI_BRAND } from '@/lib/planmi/products';
import { getSiteUrl } from '@/lib/seo/site';
import { listActivePricing } from '@/lib/billing/repository';

export const metadata: Metadata = {
  title: 'PlanMiJubilación — Ecosistema PlanMi | Planifica tu jubilación',
  description:
    'Plataforma integral de planificación social y financiera. Jubilación, prestaciones y vida laboral sobre un mismo expediente digital seguro.',
  alternates: { canonical: getSiteUrl() },
  openGraph: {
    title: 'PlanMiFuturo · Ecosistema PlanMi',
    description:
      'Jubilación, prestaciones y vida laboral sobre un mismo expediente digital.',
    url: getSiteUrl(),
  },
};

function JsonLd() {
  const base = getSiteUrl();
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'PlanMiJubilación',
        url: base,
        logo: `${base}/logo1.png`,
        founder: {
          '@type': 'Person',
          name: 'Ramón del Pozo Rott',
        },
        contactPoint: {
          '@type': 'ContactPoint',
          email: 'info@ramondelpozorott.es',
          contactType: 'customer service',
          availableLanguage: 'Spanish',
        },
      },
      {
        '@type': 'WebSite',
        name: 'PlanMiJubilación',
        url: base,
        inLanguage: 'es-ES',
        description:
          'Ecosistema PlanMi: planificación de jubilación, prestaciones y vida laboral.',
        publisher: { '@type': 'Organization', name: 'PlanMiJubilación' },
      },
      {
        '@type': 'SoftwareApplication',
        name: 'PlanMiJubilación',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function HomePage() {
  const [user, pricing] = await Promise.all([getUser(), listActivePricing()]);

  return (
    <main className="min-h-screen">
      <JsonLd />
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-20 print:hidden">
        <div className="max-w-6xl mx-auto px-6 py-6 md:py-7 flex items-center justify-between gap-4">
          <Logo priority size="home" />
          <div className="flex gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button>Ir al dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/contacto">
                  <Button variant="ghost">Contacto</Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost">Iniciar sesión</Button>
                </Link>
                <Link href="/login">
                  <Button>Empezar</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_80%_-10%,hsla(239,84%,67%,0.16),transparent_60%),radial-gradient(700px_360px_at_10%_20%,hsla(160,84%,39%,0.12),transparent_55%)]"
          aria-hidden
        />
        <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-28">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground animate-fade-up">
            {PLANMI_BRAND}
          </p>
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl animate-fade-up [animation-delay:60ms]">
            PlanMiFuturo
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed animate-fade-up [animation-delay:120ms]">
            Plataforma integral de planificación social y financiera. Jubilación, prestaciones y
            vida laboral sobre un mismo expediente digital.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 animate-fade-up [animation-delay:180ms] print:hidden">
            <Link href={user ? '/dashboard' : '/login'}>
              <Button size="lg">{user ? 'Abrir mi suite' : 'Empezar gratis'}</Button>
            </Link>
            <Link href={user ? '/upload' : '/login'}>
              <Button size="lg" variant="secondary">
                Subir documentos
              </Button>
            </Link>
          </div>
          <p className="mt-8 text-xs text-muted-foreground max-w-xl">
            Simulaciones orientativas. No sustituyen el cálculo oficial de la Seguridad Social.
            Tus documentos se tratan con acceso restringido y cifrado en tránsito.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="mb-8 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Cuatro productos</h2>
          <p className="mt-3 text-muted-foreground text-sm sm:text-base">
            Cuatro productos sobre el mismo expediente digital: jubilación, prestaciones, vida
            laboral y visión integral.
          </p>
        </div>
        <PlanMiSuite variant="marketing" loggedIn={Boolean(user)} />
      </section>

      <section className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <PricingTable pricing={pricing} variant="marketing" />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
