import { LegalLayout } from '@/components/layout/legal-layout';
import { LegalSeeAlso } from '@/components/layout/site-footer';

export const metadata = {
  title: 'Política de Privacidad',
  description:
    'Política de privacidad y protección de datos personales de PlanMiJubilación (RGPD y LOPDGDD).',
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad">
      <p>
        En <strong>PlanMiJubilación</strong> (Ecosistema PlanMi) nos comprometemos a proteger tus
        datos personales conforme al Reglamento (UE) 2016/679 (<strong>RGPD</strong>), la Ley
        Orgánica 3/2018 (<strong>LOPDGDD</strong>) y la normativa española aplicable. Esta política
        explica qué datos tratamos, con qué finalidades, durante cuánto tiempo y qué derechos
        tienes.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>
          <strong>Identidad:</strong> PlanMiJubilación S.L. (en constitución)
        </li>
        <li>
          <strong>Domicilio:</strong> Madrid, España
        </li>
        <li>
          <strong>Correo de privacidad / DPD (contacto):</strong>{' '}
          <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>
        </li>
        <li>
          <strong>Sitio web:</strong>{' '}
          <a href="https://planmijubilacion.es">https://planmijubilacion.es</a>
        </li>
      </ul>
      <p>
        Los datos societarios definitivos se actualizarán en el{' '}
        <a href="/legal/aviso-legal">Aviso legal</a> cuando la sociedad quede constituida.
      </p>

      <h2>2. Datos que recopilamos</h2>
      <p>Según el uso que hagas de la Plataforma, podemos tratar:</p>
      <ul>
        <li>
          <strong>Datos de cuenta:</strong> correo electrónico, identificador de usuario,
          credenciales gestionadas por el proveedor de autenticación (Supabase Auth), preferencias
          de perfil.
        </li>
        <li>
          <strong>Documentos laborales y de Seguridad Social:</strong> vida laboral, bases de
          cotización, simulaciones oficiales, nóminas, cartas de pensión extranjera u otros PDF que
          subas voluntariamente a tu expediente digital.
        </li>
        <li>
          <strong>Datos derivados del expediente:</strong> fechas, periodos cotizados, bases,
          supuestos de vida laboral (p. ej. desempleo o subsidio) e importes que indiques para
          cotizaciones internacionales documentadas.
        </li>
        <li>
          <strong>Datos de facturación</strong> (si contratas un servicio de pago): datos necesarios
          para emitir factura o recibo, conforme a la normativa fiscal.
        </li>
        <li>
          <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo/navegador, registros de
          seguridad y, si das consentimiento, datos analíticos agregados (ver Política de cookies).
        </li>
      </ul>
      <p>
        No te pedimos datos especialmente sensibles más allá de lo necesario para el servicio. Los
        documentos de Seguridad Social pueden contener información laboral y identificativa; los
        tratamos con medidas reforzadas de seguridad y acceso restringido.
      </p>

      <h2>3. Finalidades y base jurídica</h2>
      <ul>
        <li>
          <strong>Prestación del servicio</strong> (análisis del expediente, simulaciones de
          jubilación, prestaciones, cotizaciones internacionales documentadas, informes): ejecución
          del contrato / medidas precontractuales (art. 6.1.b RGPD).
        </li>
        <li>
          <strong>Generación de estimaciones con modelos e IA</strong> a partir de tus documentos y
          datos: ejecución del contrato. Los modelos se usan para asistir al análisis; no venden tus
          documentos a terceros con fines ajenos al servicio.
        </li>
        <li>
          <strong>Gestión de cuenta, soporte y comunicaciones del servicio:</strong> ejecución del
          contrato e interés legítimo en mantener la seguridad y calidad (art. 6.1.f RGPD).
        </li>
        <li>
          <strong>Facturación y obligaciones contables/fiscales:</strong> obligación legal (art.
          6.1.c RGPD).
        </li>
        <li>
          <strong>Cookies analíticas opcionales:</strong> consentimiento (art. 6.1.a RGPD), cuando
          aplique.
        </li>
      </ul>

      <h2>4. Destinatarios y encargados</h2>
      <p>
        Tus datos no se venden. Pueden acceder a ellos proveedores que actúan como encargados del
        tratamiento bajo contrato (p. ej. alojamiento, base de datos y autenticación —Supabase—,
        infraestructura cloud, herramientas de análisis si las activas, y proveedores de IA cuando
        sea necesario para extraer o interpretar documentos). Estos proveedores tratan los datos
        solo siguiendo nuestras instrucciones y con medidas de seguridad adecuadas.
      </p>
      <p>
        Podremos comunicar datos a Administraciones o autoridades cuando exista obligación legal.
      </p>

      <h2>5. Transferencias internacionales</h2>
      <p>
        Si algún proveedor trata datos fuera del Espacio Económico Europeo, se aplicarán garantías
        adecuadas (cláusulas contractuales tipo de la Comisión Europea u otras mecanismos
        reconocidos por el RGPD). Puedes solicitar más información en{' '}
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a>.
      </p>

      <h2>6. Conservación</h2>
      <ul>
        <li>
          Datos de cuenta y expediente: mientras mantengas la cuenta activa y, tras la baja, el
          tiempo mínimo necesario para atender reclamaciones o obligaciones legales.
        </li>
        <li>
          Facturas y datos de facturación: los plazos exigidos por la normativa mercantil y fiscal
          (habitualmente varios años).
        </li>
        <li>Logs de seguridad: periodos limitados orientados a prevenir abusos e incidentes.</li>
      </ul>

      <h2>7. Tus derechos</h2>
      <p>Puedes ejercer, cuando proceda:</p>
      <ul>
        <li>Acceso, rectificación y supresión</li>
        <li>Limitación u oposición al tratamiento</li>
        <li>Portabilidad</li>
        <li>Retirada del consentimiento (sin efectos retroactivos)</li>
        <li>Reclamación ante la Agencia Española de Protección de Datos (AEPD): www.aepd.es</li>
      </ul>
      <p>
        Para ejercer tus derechos, escribe a{' '}
        <a href="mailto:privacidad@planmijubilacion.es">privacidad@planmijubilacion.es</a> indicando
        el derecho que solicitas y datos suficientes para identificarte. Responderemos en el plazo
        legal.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Aplicamos medidas técnicas y organizativas apropiadas: cifrado TLS en tránsito, control de
        accesos, segregación de entornos, políticas de mínimo privilegio y revisión de incidentes.
        Ningún sistema es 100 % seguro; si detectas un problema, avísanos de inmediato.
      </p>

      <h2>9. Menores</h2>
      <p>
        El servicio está dirigido a personas mayores de 18 años. No recopilamos de forma consciente
        datos de menores. Si tienes conocimiento de un registro indebido, contáctanos para
        eliminarlo.
      </p>

      <h2>10. Cambios</h2>
      <p>
        Podemos actualizar esta política para reflejar cambios legales o del servicio. La versión
        vigente se publica en esta página con su fecha de actualización.
      </p>

      <LegalSeeAlso current="/legal/privacy" />
    </LegalLayout>
  );
}
