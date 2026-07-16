'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LifePathAssumptions } from '@/lib/calculator/life-path';
import { isSubsidio52Active } from '@/lib/calculator/life-path';
import { updateLifePathAction } from '@/app/(app)/asesoria/actions';
import { toast } from 'sonner';

export function ConsultationLifePathForm({
  caseId,
  lifePath,
}: {
  caseId: string;
  lifePath: LifePathAssumptions;
}) {
  const [pending, setPending] = useState(false);
  const subsidioOn = isSubsidio52Active(lifePath);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      await updateLifePathAction(caseId, fd);
      toast.success('Escenario actualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-5 space-y-4 print:hidden">
      <div>
        <h2 className="font-semibold">Escenario vital de esta persona</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define qué le pasa a él/ella (no tu caso). El cálculo de jubilación y MIOP usan estos
          datos.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="currentlyUnemployed"
          defaultChecked={lifePath.currentlyUnemployed}
          className="rounded"
        />
        Está en paro / desempleo ahora
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="subsidio52Active"
          defaultChecked={subsidioOn}
          className="rounded"
        />
        Cobrará subsidio mayores de 52 (cotiza a la SS)
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">Inicio subsidio +52 (mes)</span>
        <input
          type="month"
          name="subsidioMayores52From"
          defaultValue={subsidioOn ? lifePath.subsidioMayores52From : '2027-02'}
          className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="text-muted-foreground">
          Base cotización entre hoy y el subsidio (€/mes, 0 = conservador)
        </span>
        <input
          type="number"
          name="desempleoBaseAntesSubsidio"
          min={0}
          step={1}
          defaultValue={lifePath.desempleoBaseAntesSubsidio}
          className="mt-1 w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar escenario'}
      </Button>
    </form>
  );
}
