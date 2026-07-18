/**
 * Cola de procesamiento documental (SIP Fase 2).
 * Contrato estable: enqueue → process. Workers reales (Inngest) reemplazarán
 * el fire-and-forget de Next.js sin cambiar esta API.
 */
import { createClient } from '@/lib/supabase/server';
import { downloadDocument } from '@/lib/supabase/storage';
import { runDocumentPipeline } from '@/lib/ocr/pipeline';
import { hashDocumentContent } from '@/lib/ocr/content-hash';

export async function enqueueDocumentProcessing(
  userId: string,
  documentId: string
): Promise<{ queued: true }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('documents')
    .update({ ocr_status: 'pending', ocr_error: null })
    .eq('id', documentId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  return { queued: true };
}

export async function processQueuedDocument(
  userId: string,
  documentId: string,
  options: { force?: boolean } = {}
): Promise<{
  success: boolean;
  detectedType?: string;
  expedienteScore?: number;
  discrepancies?: number;
  skipped?: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select(
      'id, name, storage_path, mime_type, document_type, content_hash, ocr_status, ocr_data, processing_attempts'
    )
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !doc?.storage_path) {
    return { success: false, error: 'Documento no encontrado' };
  }

  await supabase
    .from('documents')
    .update({
      ocr_status: 'processing',
      ocr_error: null,
      processing_attempts: (doc.processing_attempts ?? 0) + 1,
    })
    .eq('id', documentId);

  try {
    const { buffer, mimeType } = await downloadDocument(doc.storage_path);
    const contentHash = hashDocumentContent(buffer);

    // Idempotencia: mismo binario ya completado → no gastar OpenAI (salvo force)
    if (
      !options.force &&
      doc.content_hash &&
      doc.content_hash === contentHash &&
      doc.ocr_status === 'completed' &&
      doc.ocr_data
    ) {
      await supabase
        .from('documents')
        .update({ ocr_status: 'completed', content_hash: contentHash })
        .eq('id', documentId);
      return {
        success: true,
        skipped: true,
        detectedType: doc.document_type ?? undefined,
      };
    }

    // Si otro doc del mismo usuario tiene el mismo hash ya OCR'izado, reutilizar
    if (!options.force) {
      const { data: twin } = await supabase
        .from('documents')
        .select('ocr_data, ocr_confidence, document_type')
        .eq('user_id', userId)
        .eq('content_hash', contentHash)
        .eq('ocr_status', 'completed')
        .neq('id', documentId)
        .not('ocr_data', 'is', null)
        .maybeSingle();

      if (twin?.ocr_data) {
        await supabase
          .from('documents')
          .update({
            ocr_status: 'completed',
            ocr_data: twin.ocr_data,
            ocr_confidence: twin.ocr_confidence,
            document_type: twin.document_type ?? doc.document_type,
            content_hash: contentHash,
            processed_at: new Date().toISOString(),
            ocr_error: null,
          })
          .eq('id', documentId);

        // Reconstruir expediente con todos los docs (incluye este clon)
        const { rebuildExpedienteFromDocuments } = await import('@/lib/ocr/pipeline');
        const expediente = await rebuildExpedienteFromDocuments(userId);

        return {
          success: true,
          skipped: true,
          detectedType: twin.document_type ?? undefined,
          expedienteScore: expediente.completitud.score,
          discrepancies: expediente.discrepancies.length,
        };
      }
    }

    const result = await runDocumentPipeline({
      userId,
      documentId: doc.id,
      documentName: doc.name,
      documentTypeHint: doc.document_type || 'vida_laboral',
      fileBuffer: buffer,
      mimeType: doc.mime_type || mimeType,
    });

    await supabase
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_data: result.ocrData,
        ocr_confidence: result.ocrData.confidence,
        document_type: result.detectedType,
        content_hash: contentHash,
        processed_at: new Date().toISOString(),
        ocr_error: null,
      })
      .eq('id', documentId);

    if (result.replacedDocs.length > 0) {
      const { deleteDocumentRows } = await import('@/lib/documents/replace-same-type');
      await deleteDocumentRows(supabase, userId, result.replacedDocs);
    }

    return {
      success: true,
      detectedType: result.detectedType,
      expedienteScore: result.expediente.completitud.score,
      discrepancies: result.expediente.discrepancies.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al procesar';
    await supabase
      .from('documents')
      .update({ ocr_status: 'failed', ocr_error: message })
      .eq('id', documentId);
    return { success: false, error: message };
  }
}
