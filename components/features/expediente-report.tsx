'use client';

import { PrintButton } from '@/components/features/print-button';
import { ExpedienteSections } from '@/components/features/expediente-sections';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';

export function ExpedienteReport({
  expediente,
  outlook,
}: {
  expediente: ExpedienteDigital;
  outlook?: RetirementOutlook | null;
}) {
  return (
    <div className="space-y-5 print-root">
      <div className="no-print flex justify-end">
        <PrintButton label="Imprimir expediente" />
      </div>

      <ExpedienteSections expediente={expediente} outlook={outlook} />

      <p className="print-footer">
        PlanMiJubilacion · Expediente digital · Completitud {expediente.completitud.score}% ·{' '}
        {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}
