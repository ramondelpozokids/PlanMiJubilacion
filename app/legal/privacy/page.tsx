import { LegalLayout } from '@/components/layout/legal-layout';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad',
  description: 'Política de privacidad y protección de datos de PlanMiJubilacion.',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad">
      <p>
        En <strong>PlanMiJubilacion</strong> nos tomamos muy en serio la protección de tus datos
        personales conforme al <strong>RGPD</strong> y la <strong>LOPDGDD</strong>.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li><strong>Identidad:</strong> PlanMiJubilacion S.L. (en constitución)</li>
        <li><strong>Dirección:</strong> Madrid, España</li>
        <li><strong>Correo DPD:</strong> privacidad@planmijubilacion.es</li>
      </ul>

      <h2>2. Datos que recopilamos</h2>
      <p>Datos de cuenta, documentos laborales subidos y datos técnicos necesarios para el servicio.</p>

      <h2>3. Finalidades</h2>
      <ul>
        <li>Prestar el servicio de análisis y planificación de jubilación.</li>
        <li>Generar simulaciones personalizadas mediante IA.</li>
        <li>Cumplir obligaciones legales.</li>
      </ul>

      <h2>4. Tus derechos</h2>
      <p>
        Puedes ejercer acceso, rectificación, supresión, oposición y portabilidad escribiendo a{' '}
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>.
      </p>

      <h2>5. Seguridad</h2>
      <p>Cifrado TLS en tránsito, control de accesos y medidas organizativas apropiadas.</p>

      <p className="not-prose text-sm">
        Ver también: <Link href="/legal/terms">Términos</Link> ·{' '}
        <Link href="/legal/cookies">Cookies</Link>
      </p>
    </LegalLayout>
  );
}
