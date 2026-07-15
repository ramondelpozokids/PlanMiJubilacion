import { LegalLayout } from '@/components/layout/legal-layout';
import Link from 'next/link';

export const metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de PlanMiJubilacion.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Términos y Condiciones">
      <h2>1. Objeto</h2>
      <p>
        Estos términos regulan el acceso y uso de la Plataforma <strong>PlanMiJubilacion</strong>,
        ofrecida por PlanMiJubilacion S.L. (en constitución), con domicilio en Madrid, España.
      </p>

      <h2>2. Naturaleza del servicio</h2>
      <p>
        <strong>IMPORTANTE:</strong> PlanMiJubilacion ofrece <strong>simulaciones orientativas</strong>{' '}
        basadas en los datos aportados por el usuario y en modelos simplificados.{' '}
        <strong>No sustituye al cálculo oficial de la Seguridad Social</strong> ni constituye
        asesoramiento jurídico, financiero o laboral vinculante.
      </p>
      <p>
        Antes de tomar decisiones relevantes, consulta con la Seguridad Social o con un profesional
        cualificado.
      </p>

      <h2>3. Registro y cuenta</h2>
      <p>
        Para usar ciertas funcionalidades debes crear una cuenta. Eres responsable de mantener la
        confidencialidad de tus credenciales y de toda la actividad que se realice desde tu cuenta.
      </p>

      <h2>4. Uso aceptable</h2>
      <ul>
        <li>No usar la Plataforma con fines ilícitos o fraudulentos.</li>
        <li>No subir documentos de terceros sin su consentimiento.</li>
        <li>No intentar vulnerar la seguridad de la Plataforma.</li>
        <li>No realizar ingeniería inversa sobre el software.</li>
      </ul>

      <h2>5. Propiedad intelectual</h2>
      <p>
        Todos los contenidos, marcas, diseños y código de la Plataforma son propiedad de
        PlanMiJubilacion S.L. o de sus licenciantes.
      </p>

      <h2>6. Planes y precios</h2>
      <p>
        La Plataforma ofrece un plan gratuito y planes de pago. Los precios se muestran antes de
        la contratación y pueden actualizarse con preaviso de 30 días.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        La Plataforma se proporciona &quot;tal cual&quot;. No garantizamos que las simulaciones sean exactas
        ni que el servicio esté libre de errores.
      </p>

      <h2>8. Ley aplicable</h2>
      <p>Estos términos se rigen por la legislación española.</p>

      <h2>9. Contacto</h2>
      <p>
        <a href="mailto:legal@planmijubilacion.es">legal@planmijubilacion.es</a>
      </p>
      <p className="not-prose text-sm">
        Ver también: <Link href="/legal/privacy">Política de privacidad</Link> ·{' '}
        <Link href="/legal/cookies">Política de cookies</Link>
      </p>
    </LegalLayout>
  );
}
