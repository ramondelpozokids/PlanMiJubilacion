import { createClient, getUser } from '@/lib/supabase/server';
import { ProcessingAutoRefresh } from '@/components/features/processing-auto-refresh';

/** Banner + refresh mientras haya documentos OCR pendientes (cualquier página del app). */
export async function DocumentsProcessingBanner() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('ocr_status', ['pending', 'processing']);

  const active = (count ?? 0) > 0;
  if (!active) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <ProcessingAutoRefresh active />
    </div>
  );
}
