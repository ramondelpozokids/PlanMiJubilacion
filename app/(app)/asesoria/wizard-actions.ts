'use server';

import { revalidatePath } from 'next/cache';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente, saveExpediente } from '@/lib/expediente/repository';
import { uploadDocumentOnly } from '@/app/(app)/upload/actions';
import { DOCUMENT_TYPE_KEYS } from '@/lib/expediente/document-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

const IMAGE_PDF = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const SPREADSHEET = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function fail(error: string) {
  return { success: false as const, error };
}

export async function getWizardExpedienteAction() {
  try {
    const profile = await getProfile();
    if (!profile) return fail('Debes iniciar sesión');
    const expediente = await loadExpediente(profile.id);
    return { success: true as const, expediente };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Error al cargar expediente');
  }
}

export async function saveWizardBirthDateAction(birthIso: string) {
  try {
    const profile = await getProfile();
    if (!profile) return fail('Debes iniciar sesión');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthIso)) {
      return fail('Fecha de nacimiento no válida');
    }
    const [y, m, d] = birthIso.split('-');
    const dmy = `${d}/${m}/${y}`;

    let expediente = await loadExpediente(profile.id);
    if (!expediente) {
      const { emptyExpediente } = await import('@/lib/expediente/types');
      expediente = emptyExpediente(profile.id);
    }

    expediente.identificacion.fechaNacimiento = {
      value: dmy,
      sources: [
        {
          documentId: 'wizard-manual',
          documentName: 'Asesoría gratuita — datos personales',
          documentType: 'otro',
          extractedAt: new Date().toISOString(),
        },
      ],
    };
    expediente.updatedAt = new Date().toISOString();
    await saveExpediente(expediente);
    revalidatePath('/asesoria');
    revalidatePath('/jubilacion');
    return { success: true as const, ok: true as const };
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Error al guardar');
  }
}

/**
 * Misma ruta que /upload del fundador (uploadDocumentOnly → size_bytes + storage).
 * No duplicar el insert: ahí estaba el bug file_size.
 */
export async function uploadWizardDocumentAction(formData: FormData) {
  try {
    const profile = await getProfile();
    if (!profile) return fail('Debes iniciar sesión');

    const file = formData.get('file') as File;
    const kind = String(formData.get('kind') ?? '') as DocumentTypeKey;
    if (!file || file.size === 0) return fail('Archivo vacío');
    if (file.size > 12 * 1024 * 1024) return fail('Máximo 12 MB');

    const allowedKinds = ['vida_laboral', 'bases_cotizacion', 'nomina'] as const;
    if (!allowedKinds.includes(kind as (typeof allowedKinds)[number])) {
      return fail('Tipo de documento no válido');
    }
    if (!DOCUMENT_TYPE_KEYS.includes(kind)) {
      return fail('Tipo no reconocido');
    }

    const isSheet = SPREADSHEET.includes(file.type) || /\.(csv|xlsx|xls)$/i.test(file.name);
    const isPdfImg = IMAGE_PDF.includes(file.type);

    if (kind === 'bases_cotizacion') {
      if (!isPdfImg && !isSheet) {
        return fail('Bases: usa PDF, Excel (.xlsx) o CSV');
      }
    } else if (!isPdfImg) {
      return fail('Usa PDF o imagen (JPG/PNG/WebP)');
    }

    // Hojas: aún no pasan por el OCR PDF del fundador
    if (isSheet && !isPdfImg) {
      const { uploadDocument } = await import('@/lib/supabase/storage');
      const { createClient } = await import('@/lib/supabase/server');
      const storagePath = await uploadDocument(file, profile.id);
      const supabase = await createClient();
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          user_id: profile.id,
          name: file.name,
          storage_path: storagePath,
          document_type: kind,
          mime_type: file.type || 'application/octet-stream',
          size_bytes: file.size,
          ocr_status: 'pending',
        })
        .select('id')
        .single();
      if (error || !doc) return fail(error?.message ?? 'No se pudo registrar el documento');
      revalidatePath('/asesoria');
      revalidatePath('/analysis');
      return {
        success: true as const,
        documentId: doc.id as string,
        needsClientEnqueue: false,
        spreadsheetOnly: true,
      };
    }

    const fd = new FormData();
    fd.set('file', file);
    fd.set('documentType', kind);
    const uploaded = await uploadDocumentOnly(fd);
    if (!uploaded.success) return fail(uploaded.error);

    revalidatePath('/asesoria');
    return {
      success: true as const,
      documentId: uploaded.documentId,
      needsClientEnqueue: true,
      spreadsheetOnly: false,
    };
  } catch (e) {
    console.error('uploadWizardDocumentAction:', e);
    return fail(e instanceof Error ? e.message : 'Error al subir el documento');
  }
}
