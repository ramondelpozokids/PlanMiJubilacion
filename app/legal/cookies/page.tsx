import { LegalLayout } from '@/components/layout/legal-layout';
import { LegalSeeAlso } from '@/components/layout/site-footer';

export const metadata = {
  title: 'Política de Cookies',
  description: 'Política de cookies de PlanMiJubilación conforme a la LSSI-CE y ePrivacy.',
};

export default function CookiesPage() {
  return (
    <LegalLayout title="Política de Cookies">
      <p>
        Esta política explica cómo <strong>PlanMiJubilación</strong> utiliza cookies y tecnologías
        similares en su sitio web y plataforma, de conformidad con la <strong>LSSI-CE</strong>, la
        normativa de privacidad electrónica (ePrivacy) y el <strong>RGPD</strong>.
      </p>
      <p>
        Una cookie es un pequeño archivo que el navegador almacena en tu dispositivo. También pueden
        usarse almacenamiento local u otras tecnologías equivalentes con finalidades similares.
      </p>

      <h2>1. ¿Quién utiliza las cookies?</h2>
      <p>
        El responsable es PlanMiJubilación S.L. (en constitución). Contacto:{' '}
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>. Más
        datos en el <a href="/legal/aviso-legal">Aviso legal</a> y la{' '}
        <a href="/legal/privacy">Política de privacidad</a>.
      </p>

      <h2>2. Cookies técnicas (necesarias)</h2>
      <p>
        Son imprescindibles para el funcionamiento del servicio (autenticación, seguridad,
        preferencias básicas). <strong>No requieren consentimiento</strong> conforme a la
        normativa, aunque puedes borrarlas desde el navegador (lo que puede impedir el uso normal de
        la cuenta).
      </p>
      <ul>
        <li>
          <strong>Sesión de autenticación (Supabase Auth):</strong> mantiene tu sesión iniciada de
          forma segura.
        </li>
        <li>
          <strong>Preferencia de tema</strong> (claro/oscuro), si la activas.
        </li>
        <li>
          <strong>Cookies de seguridad / antifraude</strong> necesarias para proteger el acceso.
        </li>
      </ul>

      <h2>3. Cookies analíticas (opcionales)</h2>
      <p>
        Nos ayudan a entender el uso de la Plataforma de forma agregada (páginas visitadas,
        rendimiento) para mejorar el producto. En la medida en que usemos{' '}
        <strong>PostHog</strong> u otra herramienta similar con datos anonimizados o
        seudonimizados, <strong>solo se activarán con tu consentimiento</strong>, cuando el banner
        o ajustes lo permitan.
      </p>
      <p>
        Si no consientes, la Plataforma seguirá funcionando; simplemente no mediremos el uso con
        esas herramientas opcionales.
      </p>

      <h2>4. Cookies de terceros</h2>
      <p>
        Algunos proveedores (autenticación, analítica, infraestructura) pueden establecer cookies
        propias bajo su responsabilidad o como encargados. Te recomendamos revisar también sus
        políticas cuando proceda.
      </p>

      <h2>5. Duración</h2>
      <ul>
        <li>
          <strong>De sesión:</strong> se eliminan al cerrar el navegador.
        </li>
        <li>
          <strong>Persistentes:</strong> permanecen un tiempo definido (p. ej. preferencias o
          renovación de sesión) y después caducan o se renuevan.
        </li>
      </ul>

      <h2>6. Cómo gestionar o rechazar cookies</h2>
      <p>Puedes:</p>
      <ul>
        <li>
          Configurar tu navegador para bloquear o eliminar cookies (Chrome, Firefox, Safari, Edge,
          etc.).
        </li>
        <li>
          Usar el panel de preferencias de la Plataforma cuando esté disponible (ajustes /
          consentimiento).
        </li>
        <li>
          Revocar el consentimiento de analítica en cualquier momento, sin afectar a las cookies
          estrictamente necesarias.
        </li>
      </ul>
      <p>
        Ten en cuenta que bloquear todas las cookies puede impedir iniciar sesión o guardar
        preferencias.
      </p>

      <h2>7. Actualizaciones</h2>
      <p>
        Podemos actualizar esta política si cambia la tecnología o la normativa. La versión vigente
        es la publicada en esta página.
      </p>

      <h2>8. Contacto</h2>
      <p>
        Dudas sobre cookies o privacidad:{' '}
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>.
      </p>

      <LegalSeeAlso current="/legal/cookies" />
    </LegalLayout>
  );
}
