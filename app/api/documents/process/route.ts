import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { processQueuedDocument } from '@/lib/ocr/queue';
import { revalidatePath } from 'next/cache';
import { rateLimit } from '@/lib/security/rate-limit';

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const limited = rateLimit(`docs-process:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Demasiadas peticiones. Espera un momento.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  const body = await req.json();
  const documentId = body.documentId as string | undefined;
  const wait = body.wait !== false; // por defecto espera resultado
  const force = body.force === true;

  if (!documentId) {
    return NextResponse.json({ error: 'documentId requerido' }, { status: 400 });
  }

  if (!wait) {
    // Fire-and-forget: responde ya y procesa en background
    void processQueuedDocument(user.id, documentId, { force }).then(() => {
      revalidatePath('/dashboard');
      revalidatePath('/analysis');
      revalidatePath('/upload');
    });
    return NextResponse.json({ success: true, queued: true, documentId });
  }

  const result = await processQueuedDocument(user.id, documentId, { force });
  revalidatePath('/dashboard');
  revalidatePath('/analysis');
  revalidatePath('/upload');

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result);
}
