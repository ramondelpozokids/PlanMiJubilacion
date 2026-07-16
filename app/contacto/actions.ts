'use server';

import { headers } from 'next/headers';
import { saveContactSubmission, hashIp } from '@/lib/contact/repository';

const MAX_FILES = 5;
const MAX_MESSAGE = 8000;

export type ContactActionResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function submitContactAction(formData: FormData): Promise<ContactActionResult> {
  try {
    const name = String(formData.get('name') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const phone = String(formData.get('phone') ?? '').trim() || null;
    const subject = String(formData.get('subject') ?? '').trim();
    const message = String(formData.get('message') ?? '').trim();
    const consent = formData.get('consent') === 'true' || formData.get('consent') === 'on';
    const honeypot = String(formData.get('company') ?? '').trim();
    const attachmentsJson = String(formData.get('attachmentsJson') ?? '');

    if (honeypot) return { success: true, id: 'ok' }; // bot

    if (!name || name.length < 2) return { success: false, error: 'Indica tu nombre.' };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Email no válido.' };
    }
    if (!subject || subject.length < 3) return { success: false, error: 'Indica un asunto.' };
    if (!message || message.length < 10) {
      return { success: false, error: 'El mensaje es demasiado corto.' };
    }
    if (message.length > MAX_MESSAGE) {
      return { success: false, error: 'El mensaje es demasiado largo.' };
    }
    if (!consent) {
      return { success: false, error: 'Debes aceptar la política de privacidad.' };
    }

    let encryptedFiles: {
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      ciphertextB64: string;
      ivB64: string;
      fileKeyB64: string;
    }[] = [];

    if (attachmentsJson) {
      try {
        const parsed = JSON.parse(attachmentsJson) as typeof encryptedFiles;
        if (!Array.isArray(parsed)) throw new Error('formato');
        if (parsed.length > MAX_FILES) {
          return { success: false, error: `Máximo ${MAX_FILES} archivos.` };
        }
        encryptedFiles = parsed;
      } catch {
        return { success: false, error: 'Adjuntos no válidos.' };
      }
    }

    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null;

    const { id } = await saveContactSubmission({
      name,
      email,
      phone,
      subject,
      message,
      consentPrivacy: true,
      ipHash: hashIp(ip),
      userAgent: h.get('user-agent'),
      encryptedFiles,
    });

    return { success: true, id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al enviar';
    return { success: false, error: msg };
  }
}
