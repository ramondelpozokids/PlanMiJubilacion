import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { runMiop } from '@/lib/optimization/run';
import { formatCurrency } from '@/lib/utils';

export const metadata = { title: 'MIOP — Mejor estrategia', robots: { index: false } };

const MEDALS = ['1º', '2º', '3º'] as const;

export default async function MiopPage() {
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);

  if (!expediente || expediente.documentIds.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-semibold tracking-tight">MIOP</h1>
          <p className="text-muted-foreground mt-2">
            Motor Inteligente de Optimización de la Pensión
          </p>
        </header>
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground space-y-3">
            <p>Necesitamos el expediente (vida laboral + bases) para optimizar.</p>
            <Link href="/upload">
              <Button>Subir documentos</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const miop = runMiop(expediente);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">¿Qué tienes que hacer?</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          MIOP ha evaluado {miop.strategiesEvaluated} estrategias legales sobre tu expediente.
          No pregunta «¿cuánto cobraré?» — responde «¿qué hacer para cobrar lo máximo posible?».
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Motor económico {miop.economicFingerprint} · {new Date(miop.generatedAt).toLocaleString('es-ES')}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {miop.podium.map((s, idx) => (
          <Card
            key={s.outcome.strategyId}
            className={idx === 0 ? 'border-2 border-foreground/20' : undefined}
          >
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span className="text-lg font-semibold tabular-nums">{MEDALS[idx]}</span>
                <span className="text-muted-foreground font-normal text-sm">
                  Score {s.score}/100
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium leading-snug">{s.outcome.strategyName}</p>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Pensión</dt>
                  <dd className="font-semibold tabular-nums">
                    {s.outcome.pensionMensual != null
                      ? formatCurrency(s.outcome.pensionMensual)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Beneficio vida</dt>
                  <dd className="tabular-nums">
                    {s.outcome.lifetimeBenefit != null
                      ? formatCurrency(s.outcome.lifetimeBenefit)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Coste convenio</dt>
                  <dd className="tabular-nums">{formatCurrency(s.outcome.convenioCost)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Riesgo</dt>
                  <dd>{s.dimensions.legalStability}/100 estab.</dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.explanation}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {miop.podium.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Sin ranking aún. Relee el Informe Integral de Bases en Expediente.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conclusiones del experto</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {miop.conclusions.map((c) => (
              <li key={c} className="border-b border-border/40 pb-2 last:border-0">
                {c}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cálculo y recomendación están separados: el Motor de Cálculo solo produce números; MIOP
        puntúa y explica. Parámetros legales en{' '}
        <code>lib/rules/economic-params.json</code>.
      </p>
    </div>
  );
}
