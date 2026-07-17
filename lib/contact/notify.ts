/**
 * Contacto — correos de destino (fundador).
 * De momento sin SMTP/Resend: los mensajes van a la bandeja /asesoria/mensajes.
 */
export const CONTACT_NOTIFY_EMAIL =
  process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
  process.env.BILLING_EMAIL?.trim() ||
  'info@ramondelpozorott.es';
