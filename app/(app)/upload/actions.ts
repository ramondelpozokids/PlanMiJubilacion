'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { uploadDocument, downloadDocument } from '@/lib/supabase/storage';
import { countFullExtractionFields } from '@/lib/ai/document-ai';
import { runDocumentPipeline } from '@/lib/ocr/pipeline';
import { DOCUMENT_TYPES } from '@/lib/expediente/document-types';
import { z } from 'zod';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

const uploadSchema = z.object({
  documentType: z
    .string()
    .min(1)
    .refine((v) => v in DOCUMENT_TYPES || v === 'bases' || v === 'resolucion'),
});

function friendlyError(error: unknown): string {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error);

  if (/DOMMatrix is not defined/i.test(msg)) {
    return 'Error al leer el PDF en el servidor (DOMMatrix). Requiere redeploy con @napi-rs/canvas.';
  }
  if (/Server Components render|omitted in production/i.test(msg)) {
    return 'Error en el servidor al subir. Prueba un PDF menor de 4 MB o revisa los logs de Vercel.';
  }
  if (msg.includes('Payload Too Large') || msg.includes('413') || /body.*limit|Entity Too Large/i.test(msg)) {
    return 'El PDF es demasiado grande para el servidor (límite ~4,5 MB en Vercel). Sube un archivo más ligero.';
  }
  if (msg.includes('Bucket not found') || msg.includes('documents')) {
    return 'Bucket "documents" no existe. Ejecuta supabase/migrations/002_storage.sql en Supabase.';
  }
  if ((msg.includes('expedientes') || msg.includes('relation')) && msg.includes('does not exist')) {
    return 'Tabla expedientes no existe. Ejecuta supabase/migrations/004_expediente.sql en Supabase.';
  }
  if (msg.includes('row-level security') || msg.includes('RLS')) {
    return 'Permiso denegado. Revisa las políticas RLS en Supabase.';
  }
  if (msg.includes('Incorrect API key') || msg.includes('401')) {
    return (
      'OPENAI_API_KEY inválida. Edita .env.local con tu clave sk-... y reinicia npm run dev.'
    );
  }
  if (msg.includes('OPENAI_QUOTA') || msg.includes('429') || /quota|billing/i.test(msg)) {
    return (
      'Cuota OpenAI agotada (429). Añade crédito en ' +
      'https://platform.openai.com/settings/organization/billing y vuelve a pulsar Releer.'
    );
  }
  if (msg.includes('OPENAI_API_KEY') || msg.includes('TU_API_KEY')) return msg;

  return msg || 'Error al procesar el documento. Inténtalo de nuevo.';
}

export async function uploadDocumentOnly(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: 'No autenticado' };
    }

    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;

    if (!file || file.size === 0) {
      return { success: false as const, error: 'Archivo vacío' };
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return { success: false as const, error: 'Formato no soportado (PDF, JPG, PNG, WEBP)' };
    }
    if (file.size > MAX_SIZE) {
      return { success: false as const, error: 'Archivo demasiado grande (máx. 10 MB)' };
    }

    const validation = uploadSchema.safeParse({ documentType });
    if (!validation.success) {
      return { success: false as const, error: 'Tipo de documento inválido' };
    }

    const storagePath = await uploadDocument(file, user.id);

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        document_type: validation.data.documentType,
        ocr_status: 'pending',
      })
      .select()
      .single();

    if (docError) {
      return { success: false as const, error: friendlyError(docError) };
    }

    revalidatePath('/upload');
    revalidatePath('/analysis');

    return { success: true as const, documentId: doc.id, status: 'pending' as const };
  } catch (error) {
    console.error('uploadDocumentOnly:', error);
    return { success: false as const, error: friendlyError(error) };
  }
}

/** Sube y procesa en una sola acción (server-side). */
export async function uploadAndProcessDocument(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const file = formData.get('file') as File;
  const documentType = formData.get('documentType') as string;

  if (!file || file.size === 0) throw new Error('Archivo vacío');
  if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Formato no soportado (PDF, JPG, PNG, WEBP)');
  if (file.size > MAX_SIZE) throw new Error('Archivo demasiado grande (máx. 10 MB)');

  const validation = uploadSchema.safeParse({ documentType });
  if (!validation.success) throw new Error('Tipo de documento inválido');

  let docId: string | null = null;

  try {
    const storagePath = await uploadDocument(file, user.id);

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        document_type: validation.data.documentType,
        ocr_status: 'processing',
      })
      .select()
      .single();

    if (docError) throw docError;
    docId = doc.id;

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runDocumentPipeline({
      userId: user.id,
      documentId: doc.id,
      documentName: file.name,
      documentTypeHint: validation.data.documentType,
      fileBuffer: buffer,
      mimeType: file.type,
    });

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_data: result.ocrData,
        ocr_confidence: result.ocrData.confidence,
        document_type: result.detectedType,
      })
      .eq('id', doc.id);

    if (updateError) throw updateError;

    revalidatePath('/dashboard');
    revalidatePath('/analysis');
    revalidatePath('/upload');

    return {
      success: true,
      documentId: doc.id,
      detectedType: result.detectedType,
      expedienteScore: result.expediente.completitud.score,
      fieldsExtracted: countFullExtractionFields(result.ocrData),
      discrepancies: result.expediente.discrepancies.length,
    };
  } catch (error) {
    console.error('Error procesando documento:', error);

    if (docId) {
      await supabase
        .from('documents')
        .update({
          ocr_status: 'failed',
          ocr_error: friendlyError(error),
        })
        .eq('id', docId);
    }

    throw new Error(friendlyError(error));
  }
}

export async function reprocessDocumentById(documentId: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false as const, error: 'No autenticado' };
    }

    const { processQueuedDocument } = await import('@/lib/ocr/queue');
    const result = await processQueuedDocument(user.id, documentId, { force: true });

    if (!result.success) {
      return {
        success: false as const,
        error: friendlyError(result.error ?? 'Error al reprocesar'),
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/analysis');
    revalidatePath('/upload');
    revalidatePath('/comparator');

    return {
      success: true as const,
      skipped: result.skipped ?? false,
      detectedType: result.detectedType,
      expedienteScore: result.expedienteScore,
      discrepancies: result.discrepancies,
    };
  } catch (error) {
    console.error('reprocessDocumentById:', error);
    return { success: false as const, error: friendlyError(error) };
  }
}
