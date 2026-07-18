import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { createServiceClient } from '@/lib/supabase/service';
import {
  unwrapFileKey,
  decryptAttachment,
  bufToB64,
} from '@/lib/crypto/contact-files';
import type { ContactAttachmentMeta } from '@/lib/contact/repository';
import { rateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Descarga y descifra un adjunto de contacto (solo fundador).
 * GET /api/contact/decrypt?id=SUBMISSION&path=STORAGE_PATH
 */
export async function GET(request: Request) {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const limited = rateLimit(`contact-decrypt:${profile.id}`, { limit: 40, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const path = searchParams.get('path');
  if (!id || !path) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
  }

  const secret =
    process.env.CONTACT_FILE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    return NextResponse.json({ error: 'CONTACT_FILE_SECRET no configurado' }, { status: 500 });
  }

  const supabase = createServiceClient();
  const { data: row, error } = await supabase
    .from('contact_submissions')
    .select('attachments')
    .eq('id', id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
  }

  const attachments = (row.attachments ?? []) as ContactAttachmentMeta[];
  const meta = attachments.find((a) => a.storagePath === path);
  if (!meta) {
    return NextResponse.json({ error: 'Adjunto no encontrado' }, { status: 404 });
  }

  const { data: blob, error: dlErr } = await supabase.storage
    .from('contact-encrypted')
    .download(path);
  if (dlErr || !blob) {
    return NextResponse.json({ error: 'No se pudo descargar ciphertext' }, { status: 500 });
  }

  const cipherBuf = Buffer.from(await blob.arrayBuffer());
  const cipherB64 = bufToB64(cipherBuf);

  try {
    const fileKey = await unwrapFileKey(meta.wrappedKeyB64, meta.wrapIvB64, secret);
    const plain = await decryptAttachment(cipherB64, meta.ivB64, fileKey);
    return new NextResponse(plain, {
      headers: {
        'Content-Type': meta.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.originalName)}"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch {
    return NextResponse.json({ error: 'No se pudo descifrar el adjunto' }, { status: 500 });
  }
}
