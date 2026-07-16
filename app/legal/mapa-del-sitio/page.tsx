import Link from 'next/link';
import { LegalLayout } from '@/components/layout/legal-layout';
import { LegalSeeAlso } from '@/components/layout/site-footer';

export const metadata = {
  title: 'Mapa del sitio',
  description: 'Mapa del sitio de PlanMiJubilación: páginas públicas y del ecosistema.',
};

function SiteGroup({
  title,
  items,
}: {
  title: string;
  items: { href: string; label: string; note?: string }[];
}) {
  return (
    <div className="not-prose mb-8">
      <h2 className="text-xl font-semibold tracking-tight mb-3">{title}</h2>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.href} className="flex flex-wrap items-baseline gap-2">
            <Link href={item.href} className="font-medium text-foreground underline-offset-4 hover:underline">
              {item.label}
            </Link>
            {item.note && (
              <span className="text-muted-foreground">— {item.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MapaDelSitioPage() {
  return (
    <LegalLayout title="Mapa del sitio">
      <p>
        Índice de las principales páginas de <strong>PlanMiJubilación</strong> y del Ecosistema
        PlanMi. Algunas rutas requieren iniciar sesión.
      </p>

      <SiteGroup
        title="Público"
        items={[
          { href: '/', label: 'Inicio', note: 'Portada del Ecosistema PlanMi' },
          { href: '/contacto', label: 'Contacto', note: 'Formulario y documentos cifrados' },
          { href: '/login', label: 'Iniciar sesión / Registrarse' },
        ]}
      />

      <SiteGroup
        title="Ecosistema PlanMi (área de usuario)"
        items={[
          { href: '/dashboard', label: 'Dashboard', note: 'Resumen del expediente' },
          { href: '/jubilacion', label: 'PlanMiJubilación', note: 'Fechas y pensión orientativa' },
          {
            href: '/prestaciones',
            label: 'PlanMisPrestaciones',
            note: 'Prestaciones (en expansión)',
          },
          {
            href: '/vida-laboral',
            label: 'PlanMiVidaLaboral',
            note: 'Historial laboral (en expansión)',
          },
          { href: '/futuro', label: 'PlanMiFuturo', note: 'Visión integral' },
          { href: '/upload', label: 'Subir documentos' },
          { href: '/informes', label: 'Informes y facturación' },
          {
            href: '/revision-internacional',
            label: 'Revisión internacional',
            note: 'Cotizaciones multi-país',
          },
        ]}
      />

      <SiteGroup
        title="Información legal"
        items={[
          { href: '/legal/aviso-legal', label: 'Aviso legal' },
          { href: '/legal/privacy', label: 'Política de privacidad' },
          { href: '/legal/terms', label: 'Términos y condiciones' },
          { href: '/legal/cookies', label: 'Política de cookies' },
          { href: '/legal/mapa-del-sitio', label: 'Mapa del sitio' },
          { href: '/robots.txt', label: 'robots.txt' },
          { href: '/sitemap.xml', label: 'Sitemap XML' },
        ]}
      />

      <SiteGroup
        title="Seguridad y confianza"
        items={[
          {
            href: '/.well-known/security.txt',
            label: 'security.txt',
            note: 'Contacto para incidencias de seguridad',
          },
          {
            href: '/legal/privacy',
            label: 'Capas de protección de datos',
            note: 'Auth, RLS, HTTPS/CSP, noindex del expediente',
          },
        ]}
      />

      <p className="text-sm text-muted-foreground">
        Si echas en falta alguna página o detectas un enlace roto, escríbenos a{' '}
        <a href="mailto:info@ramondelpozorott.es">info@ramondelpozorott.es</a>.
      </p>

      <LegalSeeAlso current="/legal/mapa-del-sitio" />
    </LegalLayout>
  );
}
