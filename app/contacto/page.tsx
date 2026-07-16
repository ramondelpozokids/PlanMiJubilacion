import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { SiteFooter } from '@/components/layout/site-footer';
import { ContactForm } from '@/components/features/contact-form';
import { getSiteUrl } from '@/lib/seo/site';

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Contacta con Ramón del Pozo Rott, fundador de PlanMiJubilación. Formulario seguro y envío de documentos cifrados (AES-256-GCM).',
  alternates: { canonical: `${getSiteUrl()}/contacto` },
  openGraph: {
    title: 'Contacto · PlanMiJubilación',
    description: 'Consulta segura con documentos cifrados en el navegador.',
    url: `${getSiteUrl()}/contacto`,
  },
};

export default function ContactoPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo size="lg" />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>

      <main id="main" className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            PlanMiJubilación
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Contacto</h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Escríbenos para consultas sobre jubilación, cotizaciones internacionales o el
            Ecosistema PlanMi. Fundador:{' '}
            <strong className="text-foreground">Ramón del Pozo Rott</strong>.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Documentos confidenciales</p>
          <p className="mt-1">
            Si adjuntas vida laboral, cartas de pensión u otros PDF, se{' '}
            <strong className="text-foreground">cifran en tu navegador</strong> antes de salir de tu
            dispositivo. En el servidor solo se guarda el fichero cifrado; el fundador puede
            descifrarlo en la bandeja de asesoría.
          </p>
        </div>

        <ContactForm />

        <p className="text-sm text-muted-foreground">
          También puedes escribir a{' '}
          <a href="mailto:info@ramondelpozorott.es" className="underline hover:text-foreground">
            info@ramondelpozorott.es
          </a>
          . Ver{' '}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            privacidad
          </Link>{' '}
          y{' '}
          <Link href="/legal/aviso-legal" className="underline hover:text-foreground">
            aviso legal
          </Link>
          .
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
