import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RetirementMilestone } from '@/lib/consultation/retirement-calendar';

export function ConsultationRetirementCalendar({
  milestones,
  clientName,
}: {
  milestones: RetirementMilestone[];
  clientName: string;
}) {
  if (milestones.length === 0) return null;

  return (
    <Card className="print-root">
      <CardHeader>
        <CardTitle className="text-base">Calendario de jubilación · {clientName}</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Fechas clave para decidir anticipada vs ordinaria
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {milestones.map((m, i) => (
          <div
            key={`${m.sortKey}-${i}`}
            className="flex flex-col gap-0.5 border-b border-border/40 py-3 last:border-0 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.detail}</p>
            </div>
            <p className="shrink-0 tabular-nums text-sm font-semibold sm:text-right">
              {m.dateLabel}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
