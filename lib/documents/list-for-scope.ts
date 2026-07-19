import { createClient } from '@/lib/supabase/server';
import type { DossierDocumentInput } from '@/lib/reports/build-client-dossier-report';

/**
 * Documentos del fundador (Mi plan): consultation_case_id IS NULL.
 * Documentos de un familiar/amigo: filtrados por caseId.
 */
export async function listDocumentsForScope(options: {
  userId: string;
  consultationCaseId?: string | null;
}): Promise<DossierDocumentInput[]> {
  const supabase = await createClient();
  let q = supabase
    .from('documents')
    .select('id, name, document_type, ocr_status, created_at')
    .eq('user_id', options.userId)
    .order('created_at', { ascending: false });

  if (options.consultationCaseId) {
    q = q.eq('consultation_case_id', options.consultationCaseId);
  } else {
    q = q.is('consultation_case_id', null);
  }

  const { data, error } = await q;
  if (error) {
    console.error('listDocumentsForScope:', error.message);
    return [];
  }
  return (data ?? []) as DossierDocumentInput[];
}
