'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { uploadDocument, downloadDocument } from '@/lib/supabase/storage';
import { DOCUMENT_TYPES } from '@/lib/expediente/document-types';
import {
  createConsultationCase,
  listConsultationCases,
  getConsultationCase,
  saveConsultationLifePath,
  updateConsultationCase,
  deleteConsultationCase,
} from '@/lib/consultation/repository';
import { runConsultationPipeline } from '@/lib/consultation/pipeline';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024;

function actionError(message: string) {
  return { success: false as const, error: message };
}

function parseBirthDate(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = raw.trim();
  if (!v) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: 'Fecha de nacimiento no válida' };
  const d = new Date(v + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return { ok: false, error: 'Fecha de nacimiento no válida' };
  if (d > new Date()) return { ok: false, error: 'La fecha de nacimiento no puede ser futura' };
  return { ok: true, value: v };
}

async function requireFounder() {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) {
    return null;
  }
  return profile;
}

function revalidateAsesoria(caseId?: string) {
  revalidatePath('/asesoria');
  revalidatePath('/asesoria/consultas');
  if (caseId) revalidatePath(`/asesoria/${caseId}`);
}

export async function createCaseAction(formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const clientName = String(formData.get('clientName') ?? '').trim();
    const clientNote = String(formData.get('clientNote') ?? '').trim();
    const birth = parseBirthDate(String(formData.get('clientBirthDate') ?? ''));
    if (!birth.ok) return actionError(birth.error);

    if (clientName.length < 2) return actionError('Indica el nombre de la persona');

    const c = await createConsultationCase(profile.id, clientName, {
      clientNote: clientNote || undefined,
      clientBirthDate: birth.value,
    });
    revalidateAsesoria();
    return { success: true as const, caseId: c.id };
  } catch (e) {
    console.error('createCaseAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al crear la consulta');
  }
}

export async function updateCaseAction(formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const caseId = String(formData.get('caseId') ?? '');
    const clientName = String(formData.get('clientName') ?? '').trim();
    const clientNote = String(formData.get('clientNote') ?? '').trim();
    const birth = parseBirthDate(String(formData.get('clientBirthDate') ?? ''));
    if (!birth.ok) return actionError(birth.error);

    if (!caseId) return actionError('Consulta no indicada');
    if (clientName.length < 2) return actionError('Indica el nombre de la persona');

    await updateConsultationCase(caseId, profile.id, {
      clientName,
      clientNote: clientNote || null,
      clientBirthDate: birth.value,
    });
    revalidateAsesoria(caseId);
    return { success: true as const };
  } catch (e) {
    console.error('updateCaseAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al actualizar');
  }
}

export async function deleteCaseAction(formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const caseId = String(formData.get('caseId') ?? '');
    if (!caseId) return actionError('Consulta no indicada');

    await deleteConsultationCase(caseId, profile.id);
    revalidateAsesoria();
    return { success: true as const, deleted: true as const };
  } catch (e) {
    console.error('deleteCaseAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al eliminar');
  }
}

export async function uploadConsultationDocumentAction(formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const caseId = String(formData.get('caseId') ?? '');
    const file = formData.get('file') as File;
    const documentType = String(formData.get('documentType') ?? '');

    if (!caseId) return actionError('Selecciona una consulta');
    if (!file || file.size === 0) return actionError('Archivo vacío');
    if (!ALLOWED_TYPES.includes(file.type)) return actionError('Formato no soportado');
    if (file.size > MAX_SIZE) return actionError('Máx. 10 MB');
    if (!(documentType in DOCUMENT_TYPES) && documentType !== 'bases') {
      return actionError('Tipo de documento inválido');
    }

    const existing = await getConsultationCase(caseId, profile.id);
    if (!existing) return actionError('Consulta no encontrada');

    const supabase = await createClient();
    const storagePath = await uploadDocument(file, profile.id);

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: profile.id,
        name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        storage_path: storagePath,
        document_type: documentType,
        ocr_status: 'processing',
        consultation_case_id: caseId,
      })
      .select()
      .single();

    if (docError) return actionError(docError.message);

    try {
      const downloaded = await downloadDocument(storagePath);
      const expediente = await runConsultationPipeline({
        founderId: profile.id,
        caseId,
        documentId: doc.id,
        documentName: file.name,
        documentTypeHint: documentType,
        fileBuffer: downloaded.buffer,
        mimeType: downloaded.mimeType,
      });

      await supabase
        .from('documents')
        .update({ ocr_status: 'completed', ocr_error: null })
        .eq('id', doc.id);

      revalidateAsesoria(caseId);
      return { success: true as const, completitud: expediente.completitud.score };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al procesar';
      await supabase
        .from('documents')
        .update({ ocr_status: 'failed', ocr_error: msg })
        .eq('id', doc.id);
      return actionError(msg);
    }
  } catch (e) {
    console.error('uploadConsultationDocumentAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al subir el documento');
  }
}

export async function listCasesAction() {
  const profile = await requireFounder();
  if (!profile) throw new Error('Solo el fundador puede gestionar consultas de terceros.');
  return listConsultationCases(profile.id);
}

export async function updateLifePathAction(caseId: string, formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const existing = await getConsultationCase(caseId, profile.id);
    if (!existing) return actionError('Consulta no encontrada');

    const unemployed = formData.get('currentlyUnemployed') === 'on';
    const subsidioActive = formData.get('subsidio52Active') === 'on';
    const subsidioFrom = String(formData.get('subsidioMayores52From') ?? '2099-01');
    const desempleoBase = Number(formData.get('desempleoBaseAntesSubsidio') ?? 0);

    const lifePath: LifePathAssumptions = {
      currentlyUnemployed: unemployed,
      subsidioMayores52From: subsidioActive ? subsidioFrom : '2099-01',
      subsidioCotizacionBase: null,
      desempleoBaseAntesSubsidio: Number.isFinite(desempleoBase) ? desempleoBase : 0,
    };

    await saveConsultationLifePath(caseId, profile.id, lifePath);
    revalidateAsesoria(caseId);
    return { success: true as const };
  } catch (e) {
    console.error('updateLifePathAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al guardar');
  }
}

export async function saveConsultationInternationalAction(caseId: string, formData: FormData) {
  try {
    const profile = await requireFounder();
    if (!profile) return actionError('Solo el fundador puede gestionar consultas de terceros.');

    const existing = await getConsultationCase(caseId, profile.id);
    if (!existing) return actionError('Consulta no encontrada');

    const { parseInternationalFromForm } = await import(
      '@/lib/international-coordination/evaluate'
    );
    const { saveConsultationExpediente } = await import('@/lib/consultation/repository');

    existing.expediente.internationalCotizaciones = parseInternationalFromForm(formData);
    existing.expediente.updatedAt = new Date().toISOString();
    await saveConsultationExpediente(caseId, profile.id, existing.expediente);

    revalidateAsesoria(caseId);
    return { success: true as const };
  } catch (e) {
    console.error('saveConsultationInternationalAction:', e);
    return actionError(e instanceof Error ? e.message : 'Error al guardar');
  }
}
