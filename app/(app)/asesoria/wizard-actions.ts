'use server';

import { revalidatePath } from 'next/cache';
import { getProfile, createClient } from '@/lib/supabase/server';
import { loadExpediente, saveExpediente } from '@/lib/expediente/repository';
import { uploadDocument } from '@/lib/supabase/storage';
import { DOCUMENT_TYPE_KEYS } from '@/lib/expediente/document-types';
import type { DocumentTypeKey } from '@/lib/expediente/document-types';

const IMAGE_PDF = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const SPREADSHEET = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function getWizardExpedienteAction() {
  const profile = await getProfile();
  if (!profile) throw new Error('Debes iniciar sesión');
  return loadExpediente(profile.id);
}

export async function saveWizardBirthDateAction(birthIso: string) {
  const profile = await getProfile();
  if (!profile) throw new Error('Debes iniciar sesión');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthIso)) {
    throw new Error('Fecha de nacimiento no válida');
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
  return { ok: true as const };
}

export async function uploadWizardDocumentAction(formData: FormData) {
  const profile = await getProfile();
  if (!profile) throw new Error('Debes iniciar sesión');

  const file = formData.get('file') as File;
  const kind = String(formData.get('kind') ?? '') as DocumentTypeKey;
  if (!file || file.size === 0) throw new Error('Archivo vacío');
  if (file.size > 12 * 1024 * 1024) throw new Error('Máximo 12 MB');

  const allowedKinds = ['vida_laboral', 'bases_cotizacion', 'nomina'] as const;
  if (!allowedKinds.includes(kind as (typeof allowedKinds)[number])) {
    throw new Error('Tipo de documento no válido');
  }
  if (!DOCUMENT_TYPE_KEYS.includes(kind)) {
    throw new Error('Tipo no reconocido');
  }

  const isSheet = SPREADSHEET.includes(file.type) || /\.(csv|xlsx|xls)$/i.test(file.name);
  const isPdfImg = IMAGE_PDF.includes(file.type);

  if (kind === 'bases_cotizacion') {
    if (!isPdfImg && !isSheet) {
      throw new Error('Bases: usa PDF, Excel (.xlsx) o CSV');
    }
  } else if (!isPdfImg) {
    throw new Error('Usa PDF o imagen (JPG/PNG/WebP)');
  }

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
      file_size: file.size,
      ocr_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !doc) throw new Error(error?.message ?? 'No se pudo registrar el documento');

  revalidatePath('/asesoria');
  revalidatePath('/analysis');
  return {
    documentId: doc.id as string,
    needsClientEnqueue: isPdfImg,
    spreadsheetOnly: isSheet && !isPdfImg,
  };
}
