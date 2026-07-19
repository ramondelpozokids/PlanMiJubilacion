import type { ChecklistItem, ConsultationDeliveryChecklist } from '@/lib/consultation/delivery-checklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SEVERITY_STYLE: Record<
  ChecklistItem['severity'],
  { badge: string; row: string; label: string }
> = {
  ok: {
    badge: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300',
    row: 'border-border/50',
    label: 'OK',
  },
  warn: {
    badge: 'bg-amber-500/15 text-amber-900 dark:text-amber-200',
    row: 'border-amber-500/30',
    label: 'Revisar',
  },
  block: {
    badge: 'bg-destructive/15 text-destructive',
    row: 'border-destructive/30',
    label: 'Bloquea',
  },
};

/**
 * Checklist antes de imprimir / cobrar el informe de un familiar o amigo.
 */
export function ConsultationPreSendChecklist({
  checklist,
  clientName,
}: {
  checklist: ConsultationDeliveryChecklist;
  clientName: string;
}) {
  return (
    <Card className="border-2 border-foreground/15 print:hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Checklist antes de entregar</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Revisa la calidad del expediente de {clientName} antes de imprimir el dossier o emitir
          la factura.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            checklist.readyToSend
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-destructive/40 bg-destructive/10'
          }`}
        >
          {checklist.readyToSend ? (
            <p className="font-medium">
              Listo para entregar
              {checklist.warningCount > 0
                ? ` (con ${checklist.warningCount} aviso${checklist.warningCount === 1 ? '' : 's'})`
                : ''}
              .
            </p>
          ) : (
            <p className="font-medium">
              No entregues aún: {checklist.blockingCount} punto
              {checklist.blockingCount === 1 ? '' : 's'} bloqueante
              {checklist.blockingCount === 1 ? '' : 's'}.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {checklist.okCount} OK · {checklist.warningCount} avisos · {checklist.blockingCount}{' '}
            bloqueos
          </p>
        </div>

        <ul className="space-y-2">
          {checklist.items.map((item) => {
            const style = SEVERITY_STYLE[item.severity];
            return (
              <li
                key={item.id}
                className={`rounded-md border px-3 py-2.5 text-sm ${style.row}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.label}</p>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] uppercase tracking-wide ${style.badge}`}
                  >
                    {style.label}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground leading-relaxed">{item.detail}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
