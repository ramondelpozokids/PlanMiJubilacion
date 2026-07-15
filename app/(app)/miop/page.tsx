import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { runMiop } from '@/lib/optimization/run';
import { DEFAULT_LIFE_PATH } from '@/lib/calculator/life-path';
import { deriveSubsidio52Amounts, getSubsidio52Config } from '@/lib/rules/subsidio-52';
import { formatCurrency } from '@/lib/utils';
import { MiopFreeSimulator } from '@/components/features/miop-free-simulator';

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

  const miop = runMiop(expediente, new Date(), 'standard');
  const defaultBase = deriveSubsidio52Amounts(getSubsidio52Config(2027)).baseCotizacion;
  const defaultRetirement =
    miop.podium[0]?.outcome.retirementDate != null
      ? format(miop.podium[0].outcome.retirementDate, 'yyyy-MM-dd')
      : format(new Date(2032, 7, 2), 'yyyy-MM-dd');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">¿Qué tienes que hacer?</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Barrido estándar: {miop.strategiesEvaluated} estrategias · modo {miop.mode} ·{' '}
          {(miop.elapsedMs / 1000).toFixed(2)} s. Para miles de combinaciones usa el barrido denso
          abajo.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Motor económico {miop.economicFingerprint} ·{' '}
          {new Date(miop.generatedAt).toLocaleString('es-ES')}
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
                  <dt className="text-muted-foreground">Estabilidad</dt>
                  <dd>{s.dimensions.legalStability}/100</dd>
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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Simulador libre + barrido M4</h2>
        <MiopFreeSimulator
          defaultRetirementDate={defaultRetirement}
          defaultBase={defaultBase}
          defaultSubsidioFrom={DEFAULT_LIFE_PATH.subsidioMayores52From}
        />
      </section>

      <p className="text-xs text-muted-foreground">
        Cálculo y recomendación separados. Params en{' '}
        <code>lib/rules/economic-params.json</code>. Barrido denso = chunks async sobre{' '}
        <code>evaluateScenario</code>.
      </p>
    </div>
  );
}
