'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DOCUMENT_TYPES } from '@/lib/expediente/document-types';
import { createCaseAction, uploadConsultationDocumentAction } from '@/app/(app)/asesoria/actions';
import { toast } from 'sonner';
import { ConsultationCaseEditor } from '@/components/features/consultation-case-editor';
import type { ConsultationCaseMeta } from '@/lib/consultation/repository';

export function ConsultationManager({
  cases,
  uploadOnly = false,
}: {
  cases: ConsultationCaseMeta[];
  uploadOnly?: boolean;
}) {
  const [caseId, setCaseId] = useState(cases[0]?.id ?? '');
  const [pending, setPending] = useState(false);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    try {
      const fd = new FormData(form);
      const res = await createCaseAction(fd);
      toast.success('Consulta creada');
      setCaseId(res.caseId);
      form.reset();
      window.location.href = `/asesoria/${res.caseId}`;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setPending(false);
    }
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!caseId) {
      toast.error('Crea o selecciona una consulta primero');
      return;
    }
    const form = e.currentTarget;
    setPending(true);
    try {
      const fd = new FormData(form);
      fd.set('caseId', caseId);
      const res = await uploadConsultationDocumentAction(fd);
      toast.success(`Documento procesado · expediente ${res.completitud}%`);
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={uploadOnly ? 'space-y-4' : 'space-y-6'}>
      {!uploadOnly && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={onCreate} className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Nueva consulta (gratis)</h2>
            <p className="text-sm text-muted-foreground">
              Para amigos o familiares: nombre, fecha de nacimiento y documentos.
            </p>
            <label className="block text-sm">
              <span className="text-muted-foreground">Nombre *</span>
              <input
                name="clientName"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Ej. Miguel Torrijos"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Fecha de nacimiento</span>
              <input
                name="clientBirthDate"
                type="date"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Nota (opcional)</span>
              <input
                name="clientNote"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Contexto breve"
              />
            </label>
            <Button type="submit" disabled={pending}>
              Crear consulta
            </Button>
          </form>

          <form onSubmit={onUpload} className="rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold">Subir documentos del tercero</h2>
            <label className="block text-sm">
              <span className="text-muted-foreground">Consulta</span>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">— Selecciona —</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <select
                name="documentType"
                required
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                defaultValue="vida_laboral"
              >
                {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">PDF / imagen</span>
              <input
                name="file"
                type="file"
                required
                accept=".pdf,image/*"
                className="mt-1 w-full text-sm"
              />
            </label>
            <Button type="submit" disabled={pending || !caseId}>
              Procesar documento
            </Button>
          </form>
        </div>
      )}

      {uploadOnly && (
        <form onSubmit={onUpload} className="rounded-xl border p-5 space-y-4">
          <h2 className="font-semibold">Subir más documentos</h2>
          <input type="hidden" name="caseId" value={caseId} />
          <label className="block text-sm">
            <span className="text-muted-foreground">Consulta</span>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">— Selecciona —</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.clientName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Tipo</span>
            <select
              name="documentType"
              required
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              defaultValue="vida_laboral"
            >
              {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">PDF / imagen</span>
            <input
              name="file"
              type="file"
              required
              accept=".pdf,image/*"
              className="mt-1 w-full text-sm"
            />
          </label>
          <Button type="submit" disabled={pending || !caseId}>
            Procesar documento
          </Button>
        </form>
      )}

      {!uploadOnly && cases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Consultas abiertas</h2>
          <ul className="divide-y rounded-xl border">
            {cases.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <ConsultationCaseEditor caseMeta={c} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
