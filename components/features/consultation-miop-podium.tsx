import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyExact } from '@/lib/utils';
import type { MiopRunResult } from '@/lib/optimization/types';

const MEDALS = ['1º', '2º', '3º'] as const;

export function ConsultationMiopPodium({ miop }: { miop: MiopRunResult }) {
  if (miop.podium.length === 0) return null;

  return (
    <Card className="print-root">
      <CardHeader>
        <CardTitle className="text-base">¿Qué conviene más? (MIOP)</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          {miop.strategiesEvaluated} estrategias evaluadas · mejor opción arriba
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {miop.podium.map((s, idx) => (
          <div
            key={s.outcome.strategyId}
            className={`rounded-lg border p-4 ${idx === 0 ? 'border-foreground/25 bg-muted/30' : ''}`}
          >
            <p className="text-sm font-semibold">
              {MEDALS[idx]} · {s.score}/100
            </p>
            <p className="mt-2 text-sm font-medium leading-snug">{s.outcome.strategyName}</p>
            <p className="mt-2 text-lg font-semibold tabular-nums">
              {s.outcome.pensionMensual != null
                ? formatCurrencyExact(s.outcome.pensionMensual)
                : '—'}
              <span className="text-sm font-normal text-muted-foreground"> /mes</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.explanation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
