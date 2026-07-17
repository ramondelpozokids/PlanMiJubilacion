'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  updateCaseAction,
  deleteCaseAction,
} from '@/app/(app)/asesoria/actions';
import { toast } from 'sonner';
import type { ConsultationCaseMeta } from '@/lib/consultation/repository';

function formatBirthDisplay(iso: string | null): string {
  if (!iso) return 'Sin fecha de nacimiento';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function ConsultationCaseEditor({
  caseMeta,
  compact = false,
}: {
  caseMeta: ConsultationCaseMeta;
  /** Si true, se usa en la ficha /asesoria/[id] */
  compact?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await updateCaseAction(fd);
        toast.success('Consulta actualizada');
        setEditing(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al guardar');
      }
    });
  }

  function onDelete() {
    if (
      !confirm(
        `¿Eliminar la consulta de ${caseMeta.clientName}? Se borrarán también sus documentos asociados.`
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set('caseId', caseMeta.id);
    startTransition(async () => {
      try {
        await deleteCaseAction(fd);
        toast.success('Consulta eliminada');
        router.push('/asesoria/consultas');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Error al eliminar');
      }
    });
  }

  if (editing) {
    return (
      <form
        onSubmit={onSave}
        className={
          compact
            ? 'rounded-xl border p-4 space-y-3'
            : 'rounded-lg border bg-muted/20 p-4 space-y-3'
        }
      >
        <input type="hidden" name="caseId" value={caseMeta.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">Nombre *</span>
            <input
              name="clientName"
              required
              minLength={2}
              defaultValue={caseMeta.clientName}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">Fecha de nacimiento</span>
            <input
              name="clientBirthDate"
              type="date"
              defaultValue={caseMeta.clientBirthDate ?? ''}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-muted-foreground">Nota</span>
          <input
            name="clientNote"
            defaultValue={caseMeta.clientNote ?? ''}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            Guardar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => setEditing(false)}
          >
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={
        compact
          ? 'flex flex-wrap items-start justify-between gap-3'
          : 'flex flex-wrap items-center justify-between gap-3'
      }
    >
      <div className="min-w-0">
        {!compact && <p className="font-medium">{caseMeta.clientName}</p>}
        <p className="text-xs text-muted-foreground">
          Nacimiento: {formatBirthDisplay(caseMeta.clientBirthDate)}
          {caseMeta.clientNote ? ` · ${caseMeta.clientNote}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {!compact && (
          <Link href={`/asesoria/${caseMeta.id}`}>
            <Button size="sm" variant="secondary">
              Ver informe
            </Button>
          </Link>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => setEditing(true)}
        >
          Editar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          Eliminar
        </Button>
      </div>
    </div>
  );
}
