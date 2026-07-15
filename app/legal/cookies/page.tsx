import { LegalLayout } from '@/components/layout/legal-layout';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de PlanMiJubilacion.',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Política de Cookies">
      <p>
        Cumplimos con la <strong>LSSI-CE</strong> y la <strong>Directiva ePrivacy</strong>.
      </p>

      <h2>1. Cookies técnicas (necesarias)</h2>
      <p>Imprescindibles para el funcionamiento. No requieren consentimiento.</p>
      <ul>
        <li>Sesión de autenticación (Supabase)</li>
        <li>Preferencia de tema (claro/oscuro)</li>
      </ul>

      <h2>2. Cookies analíticas (opcionales)</h2>
      <p>
        PostHog con datos anonimizados. Solo se activan con tu consentimiento.
      </p>

      <h2>3. Gestión</h2>
      <p>Puedes gestionar las cookies desde la configuración de tu navegador.</p>

      <h2>4. Contacto</h2>
      <p>
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>
      </p>

      <p className="not-prose text-sm">
        Ver también: <Link href="/legal/terms">Términos</Link> ·{' '}
        <Link href="/legal/privacy">Privacidad</Link> ·{' '}
        <Link href="/settings">Ajustes</Link>
      </p>
    </LegalLayout>
  );
}
