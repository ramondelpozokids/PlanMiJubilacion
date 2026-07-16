import { createHash } from 'node:crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { wrapFileKey, b64ToBytes } from '@/lib/crypto/contact-files';

export type ContactAttachmentMeta = {
  storagePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  ivB64: string;
  wrappedKeyB64: string;
  wrapIvB64: string;
  alg: 'AES-256-GCM';
};

export type ContactSubmission = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  attachments: ContactAttachmentMeta[];
};

function contactSecret(): string {
  const s =
    process.env.CONTACT_FILE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    '';
  if (!s || s.length < 16) {
    throw new Error(
      'Falta CONTACT_FILE_SECRET (mín. 16 caracteres) o SUPABASE_SERVICE_ROLE_KEY en el entorno'
    );
  }
  return s;
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`ip:${ip}`).digest('hex').slice(0, 32);
}

export async function saveContactSubmission(input: {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  consentPrivacy: boolean;
  ipHash: string | null;
  userAgent: string | null;
  encryptedFiles: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    ciphertextB64: string;
    ivB64: string;
    fileKeyB64: string;
  }[];
}): Promise<{ id: string }> {
  const supabase = createServiceClient();
  const secret = contactSecret();
  const submissionId = crypto.randomUUID();
  const attachments: ContactAttachmentMeta[] = [];

  for (const f of input.encryptedFiles) {
    const { wrappedKeyB64, wrapIvB64 } = await wrapFileKey(f.fileKeyB64, secret);
    const path = `${submissionId}/${crypto.randomUUID()}.bin`;
    const bytes = b64ToBytes(f.ciphertextB64);
    const { error: upErr } = await supabase.storage
      .from('contact-encrypted')
      .upload(path, new Blob([bytes], { type: 'application/octet-stream' }), {
        contentType: 'application/octet-stream',
        upsert: false,
      });
    if (upErr) throw new Error(`Error al guardar adjunto: ${upErr.message}`);

    attachments.push({
      storagePath: path,
      originalName: f.originalName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      ivB64: f.ivB64,
      wrappedKeyB64,
      wrapIvB64,
      alg: 'AES-256-GCM',
    });
  }

  const { error } = await supabase.from('contact_submissions').insert({
    id: submissionId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    subject: input.subject,
    message: input.message,
    consent_privacy: input.consentPrivacy,
    status: 'new',
    ip_hash: input.ipHash,
    user_agent: input.userAgent,
    attachments,
  });

  if (error) throw new Error(error.message);
  return { id: submissionId };
}

export async function listContactSubmissions(limit = 50): Promise<ContactSubmission[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('contact_submissions')
    .select('id, created_at, name, email, phone, subject, message, status, attachments')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes('contact_submissions')) return [];
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    attachments: (row.attachments ?? []) as ContactAttachmentMeta[],
  }));
}

export async function markContactRead(id: string) {
  const supabase = createServiceClient();
  await supabase.from('contact_submissions').update({ status: 'read' }).eq('id', id);
}
