import { LegalLayout } from '@/components/layout/legal-layout';
import { LegalSeeAlso } from '@/components/layout/site-footer';

export const metadata = {
  title: 'Términos y Condiciones',
  description: 'Términos y condiciones de uso de PlanMiJubilación y del Ecosistema PlanMi.',
};

export default function TermsPage() {
  return (
    <LegalLayout title="Términos y Condiciones">
      <p>
        Estos términos regulan el acceso y uso de la plataforma <strong>PlanMiJubilación</strong> y
        del <strong>Ecosistema PlanMi</strong> (PlanMiJubilación, PlanMisPrestaciones,
        PlanMiVidaLaboral y PlanMiFuturo), ofrecida por PlanMiJubilación S.L. (en constitución), con
        domicilio en Madrid, España (el «Prestador»).
      </p>
      <p>
        Al registrarte o usar el servicio aceptas estos términos, el{' '}
        <a href="/legal/aviso-legal">Aviso legal</a>, la{' '}
        <a href="/legal/privacy">Política de privacidad</a> y la{' '}
        <a href="/legal/cookies">Política de cookies</a>. Si no estás de acuerdo, no utilices la
        Plataforma.
      </p>

      <h2>1. Objeto del servicio</h2>
      <p>
        La Plataforma permite subir documentos laborales y de Seguridad Social, construir un
        expediente digital y obtener <strong>simulaciones e informes orientativos</strong> sobre
        jubilación, prestaciones, trayectoria laboral y, cuando aporte documentación, pensiones o
        cotizaciones en el extranjero.
      </p>
      <p>
        Algunas funciones pueden estar en fase de expansión o limitadas a determinados perfiles
        (p. ej. asesoría del fundador). El Prestador puede modificar, ampliar o retirar
        funcionalidades con el fin de mejorar el servicio, informando cuando el cambio sea
        sustancial.
      </p>

      <h2>2. Naturaleza orientativa — cláusula esencial</h2>
      <p>
        <strong>IMPORTANTE:</strong> PlanMiJubilación ofrece{' '}
        <strong>simulaciones y estimaciones orientativas</strong> basadas en los datos y documentos
        que aportas y en modelos simplificados. <strong>No sustituyen</strong> el cálculo oficial de
        la Seguridad Social, del SEPE, de organismos extranjeros ni de cualquier Administración, ni
        constituyen asesoramiento jurídico, fiscal, laboral o financiero vinculante.
      </p>
      <p>
        Los importes de pensión extranjera solo se muestran o suman cuando tú (o tu documentación
        oficial) los introduces; la Plataforma no inventa cifras de otros países. Antes de decidir
        sobre tu jubilación o prestaciones, consulta a la Administración competente o a un
        profesional cualificado.
      </p>

      <h2>3. Registro y cuenta</h2>
      <ul>
        <li>Debes proporcionar datos veraces y mantener actualizado tu correo de contacto.</li>
        <li>
          Eres responsable de la confidencialidad de tus credenciales y de la actividad realizada
          desde tu cuenta.
        </li>
        <li>
          Notifica de inmediato cualquier uso no autorizado a{' '}
          <a href="mailto:info@ramondelpozorott.es">info@ramondelpozorott.es</a>.
        </li>
        <li>
          El Prestador puede suspender cuentas que incumplan estos términos o pongan en riesgo la
          seguridad del servicio.
        </li>
      </ul>

      <h2>4. Documentos y contenido del usuario</h2>
      <p>
        Garantizas que tienes derecho a subir los documentos a tu expediente (propios o con
        consentimiento / legitimación suficiente). No debes subir documentación de terceros sin
        autorización. Conservas la titularidad de tus documentos; nos concedes una licencia limitada
        para almacenarlos y tratarlos solo para prestar el servicio.
      </p>

      <h2>5. Uso aceptable</h2>
      <ul>
        <li>No usar la Plataforma con fines ilícitos, fraudulentos o lesivos.</li>
        <li>No intentar vulnerar la seguridad, acceder a datos de otros usuarios o sobrecargar el sistema.</li>
        <li>No realizar ingeniería inversa del software salvo lo permitido por la ley.</li>
        <li>No utilizar scrapers o automatizaciones abusivas sin autorización.</li>
        <li>
          No presentar los informes de la Plataforma como resoluciones oficiales de la Seguridad
          Social u otros organismos.
        </li>
      </ul>

      <h2>6. Planes, precios y facturación</h2>
      <p>
        Puede existir un acceso gratuito y servicios de pago (informes, revisiones, etc.). Los
        precios, impuestos incluidos cuando proceda, se muestran antes de contratar. Las facturas y
        recibos se emiten conforme a la normativa aplicable. Los precios pueden actualizarse con
        preaviso razonable (habitualmente 30 días) para renovaciones o nuevas contrataciones.
      </p>

      <h2>7. Propiedad intelectual</h2>
      <p>
        Marcas, diseño, código, textos e informes generados por la Plataforma (salvo tus datos
        originales) son propiedad del Prestador o de sus licenciantes. Queda prohibida su
        explotación no autorizada.
      </p>

      <h2>8. Disponibilidad y cambios</h2>
      <p>
        Nos esforzamos por mantener el servicio disponible, pero pueden producirse interrupciones
        por mantenimiento, fuerza mayor o causas ajenas. No garantizamos disponibilidad ininterrumpida
        ni ausencia total de errores.
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, el Prestador no responde de daños indirectos,
        lucro cesante, pérdida de datos imputable al usuario, ni de decisiones tomadas basándose
        únicamente en las estimaciones de la Plataforma. Nada en estos términos limita la
        responsabilidad que no pueda excluirse por ley (p. ej. dolo o derechos imperativos del
        consumidor).
      </p>

      <h2>10. Duración y baja</h2>
      <p>
        Puedes dejar de usar el servicio y solicitar la baja de tu cuenta. Tras la baja, trataremos
        tus datos según la Política de privacidad (incluyendo plazos legales de conservación de
        facturación).
      </p>

      <h2>11. Ley aplicable y jurisdicción</h2>
      <p>
        Estos términos se rigen por la legislación española. Si eres consumidor residente en España,
        podrás reclamar ante los juzgados de tu domicilio. En los demás casos, salvo norma
        imperativa, se someten a los juzgados de Madrid.
      </p>

      <h2>12. Contacto</h2>
      <p>
        Dudas legales:{' '}
        <a href="mailto:legal@planmijubilacion.es">legal@planmijubilacion.es</a>. Soporte general:{' '}
        <a href="mailto:info@ramondelpozorott.es">info@ramondelpozorott.es</a>.
      </p>

      <LegalSeeAlso current="/legal/terms" />
    </LegalLayout>
  );
}
