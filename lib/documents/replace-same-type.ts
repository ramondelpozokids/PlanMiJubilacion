/**
 * Al subir una vida laboral o bases nuevas, se conserva solo la actual
 * y se elimina la antigua del mismo tipo (comportamiento tipo Finanzio).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  normalizeDocumentType,
  type DocumentTypeKey,
} from '@/lib/expediente/document-types';
import { removeDocumentFromExpediente } from '@/lib/expediente/merge';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { deleteDocument as deleteFromStorage } from '@/lib/supabase/storage';

const REPLACEABLE: ReadonlySet<DocumentTypeKey> = new Set([
  'vida_laboral',
  'bases_cotizacion',
]);

export function isReplaceableDocumentType(
  raw: string | null | undefined
): boolean {
  return REPLACEABLE.has(normalizeDocumentType(raw));
}

/** Tipos BD a buscar (incluye legacy `bases`). */
export function dbTypesForReplaceable(type: DocumentTypeKey): string[] {
  if (type === 'bases_cotizacion') return ['bases_cotizacion', 'bases'];
  return [type];
}

export type SameTypeDocRow = {
  id: string;
  storage_path: string | null;
  document_type: string | null;
  name: string | null;
};

/**
 * Documentos previos del mismo tipo (misma consulta o expediente personal).
 */
export async function listSameTypeDocuments(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    documentType: string;
    /** Si se indica, solo docs de esa consulta. Si null, solo personales (sin case). */
    consultationCaseId?: string | null;
    excludeDocumentId?: string;
  }
): Promise<SameTypeDocRow[]> {
  const normalized = normalizeDocumentType(opts.documentType);
  if (!REPLACEABLE.has(normalized)) return [];

  const types = dbTypesForReplaceable(normalized);
  let q = supabase
    .from('documents')
    .select('id, storage_path, document_type, name')
    .eq('user_id', opts.userId)
    .in('document_type', types)
    .order('created_at', { ascending: false });

  if (opts.consultationCaseId) {
    q = q.eq('consultation_case_id', opts.consultationCaseId);
  } else {
    q = q.is('consultation_case_id', null);
  }

  const { data, error } = await q;
  if (error) {
    console.warn('[replace-doc] listSameTypeDocuments:', error.message);
    return [];
  }

  return (data ?? []).filter((d) => d.id !== opts.excludeDocumentId);
}

/** Quita del expediente los datos que solo venían de esos documentos. */
export function stripDocumentsFromExpediente(
  expediente: ExpedienteDigital,
  documentIds: string[]
): ExpedienteDigital {
  let exp = expediente;
  for (const id of documentIds) {
    exp = removeDocumentFromExpediente(exp, id);
  }
  return exp;
}

/** Borra storage + fila documents (ignora errores de storage). */
export async function deleteDocumentRows(
  supabase: SupabaseClient,
  userId: string,
  docs: SameTypeDocRow[]
): Promise<number> {
  let deleted = 0;
  for (const doc of docs) {
    if (doc.storage_path) {
      try {
        await deleteFromStorage(doc.storage_path);
      } catch {
        /* archivo ya ausente */
      }
    }
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id)
      .eq('user_id', userId);
    if (!error) deleted++;
  }
  return deleted;
}
