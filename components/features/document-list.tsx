'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { deleteDocumentById, deleteAllDocuments } from '@/app/(app)/documents/actions';
import { reprocessDocumentById } from '@/app/(app)/upload/actions';

export type DocumentRow = {
  id: string;
  name: string;
  document_type: string | null;
  ocr_status: string | null;
  created_at: string | null;
  ocr_error?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  processing: 'Procesando…',
  completed: 'Completado',
  failed: 'Error',
};

export function DocumentList({ documents }: { documents: DocumentRow[] }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return;

    startTransition(async () => {
      try {
        await deleteDocumentById(id);
        toast.success('Documento eliminado');
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al eliminar');
      }
    });
  };

  const handleReprocess = (id: string, name: string) => {
    startTransition(async () => {
      try {
        toast.info(`Leyendo PDF completo: "${name}"… (puede tardar 1-2 min)`);
        const result = await reprocessDocumentById(id);
        router.refresh();
        if (result.skipped) {
          toast.success('Documento ya procesado (mismo archivo)');
        } else if ((result.expedienteScore ?? 0) >= 50) {
          toast.success(
            `Expediente actualizado · completitud ${result.expedienteScore}%` +
              (result.discrepancies ? ` · ${result.discrepancies} alerta(s)` : '')
          );
        } else {
          toast.warning(
            `Procesado (completitud ${result.expedienteScore ?? 0}%). Si faltan datos, Releer o sube PDF nativo SS.`
          );
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al releer');
      }
    });
  };

  const handleDeleteAll = () => {
    if (!confirm(`¿Eliminar los ${documents.length} documentos?`)) return;

    startTransition(async () => {
      try {
        const result = await deleteAllDocuments();
        toast.success(`${result.count} documento(s) eliminados`);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Error al eliminar');
      }
    });
  };

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin documentos</p>;
  }

  return (
    <div className="space-y-3">
      {documents.length > 1 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={handleDeleteAll}
            className="text-destructive hover:text-destructive"
          >
            Eliminar todos
          </Button>
        </div>
      )}
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-start gap-3 text-sm border rounded-lg p-3"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{doc.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {STATUS_LABEL[doc.ocr_status ?? ''] ?? doc.ocr_status}
              {doc.document_type ? ` · ${doc.document_type}` : ''}
            </div>
            {doc.ocr_status === 'failed' && doc.ocr_error && (
              <div className="text-xs text-destructive mt-1">{doc.ocr_error}</div>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            {(doc.ocr_status === 'completed' || doc.ocr_status === 'failed') && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => handleReprocess(doc.id, doc.name)}
              >
                Releer
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => handleDelete(doc.id, doc.name)}
              className="text-muted-foreground hover:text-destructive"
            >
              Eliminar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
