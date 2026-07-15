'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { uploadDocumentOnly } from '@/app/(app)/upload/actions';
import { useRouter } from 'next/navigation';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_KEYS } from '@/lib/expediente/document-types';

async function enqueueProcess(documentId: string) {
  const res = await fetch('/api/documents/process', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId, wait: false }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Error al encolar');
  return data;
}

export function Dropzone() {
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState('vida_laboral');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const router = useRouter();

  const onDrop = useCallback((accepted: File[]) => {
    setFiles((prev) => [...prev, ...accepted]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    try {
      const ids: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Subiendo ${i + 1}/${files.length}: ${file.name}`);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        const { documentId } = await uploadDocumentOnly(formData);
        ids.push(documentId);
      }

      setProgress('Encolando análisis IA…');
      for (const id of ids) {
        await enqueueProcess(id);
      }

      toast.success(
        `${ids.length} documento(s) en cola. El expediente se actualiza automáticamente.`
      );
      router.push('/analysis');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir');
    } finally {
      setUploading(false);
      setProgress('');
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
          ${isDragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
      >
        <input {...getInputProps()} />
        <div className="text-lg font-medium">Arrastra tus documentos aquí</div>
        <div className="text-sm text-muted-foreground mt-2">
          PDF, JPG, PNG, WEBP · Máx. 10MB · Análisis en cola
          {documentType === 'bases_cotizacion' && (
            <span className="block mt-1 text-foreground">
              Bases: solo se guardan meses hasta hoy (se ignoran proyecciones / “presente”).
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="documentType" className="block text-sm font-medium mb-2">
          Tipo de documento
        </label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          className="w-full h-10 px-3 rounded-md border bg-background text-sm"
        >
          {DOCUMENT_TYPE_KEYS.map((key) => (
            <option key={key} value={key}>
              {DOCUMENT_TYPES[key]}
            </option>
          ))}
        </select>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 border rounded-lg">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(f.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {progress && <p className="text-sm text-muted-foreground animate-pulse">{progress}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push('/dashboard')}>
          Cancelar
        </Button>
        <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
          {uploading ? 'Subiendo…' : 'Analizar con IA'}
        </Button>
      </div>
    </div>
  );
}
