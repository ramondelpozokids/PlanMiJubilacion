import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { runMiop } from '@/lib/optimization/run';
import { PLANMI_PRODUCTS, getPlanMiProduct } from '@/lib/planmi/products';
import { ProductPageHeader, EmptyProductState } from '@/components/features/planmi-suite';
import { PrintButton } from '@/components/features/print-button';
import { ScopeBadge } from '@/components/features/scope-badge';
import { formatCurrency } from '@/lib/utils';
import { FOUNDER_LIFE_PATH } from '@/lib/calculator/life-path';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';

export const metadata = { title: 'PlanMiFuturo', robots: { index: false } };

export default async function FuturoPage() {
  const product = getPlanMiProduct('futuro');
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);
  const hasDocs = Boolean(expediente && expediente.documentIds.length > 0);
  const miop = hasDocs ? runMiop(expediente!, new Date(), 'standard') : null;
  const top = miop?.podium[0] ?? null;
  const outlook = hasDocs
    ? buildRetirementOutlook(expediente!, new Date(), FOUNDER_LIFE_PATH)
    : null;

  return (
    <div className="space-y-6 print-root max-w-7xl">
      <div className="space-y-2 print:hidden">
        <ScopeBadge scope="personal" />
        <ProductPageHeader
          name={product.name}
          tagline={`${product.tagline} · Ramón del Pozo Rott · ordinaria ${outlook?.ordinary.dateLabel ?? '2032'}`}
          actions={
            <>
              <PrintButton label="Imprimir" />
              <Link href="/miop">
                <Button size="sm">Abrir MIOP</Button>
              </Link>
            </>
          }
        />
      </div>
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/15 via-background to-foreground/[0.03] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-accent/25 blur-3xl motion-reduce:hidden"
          aria-hidden
        />
        <div className="relative max-w-2xl space-y-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            PlanMiFuturo
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Una plataforma, cuatro focos</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            PlanMiFuturo integra jubilación, prestaciones e historial laboral sobre el mismo
            expediente digital. Aquí ves el siguiente paso de optimización y saltas a cada producto.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANMI_PRODUCTS.filter((p) => p.id !== 'futuro').map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="rounded-xl border bg-card p-5 transition-colors hover:border-foreground/25 hover:bg-muted/20"
          >
            <p className="text-sm font-semibold tracking-tight">{p.name}</p>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.tagline}</p>
            <p className="mt-3 text-xs font-medium print:hidden">Abrir →</p>
          </Link>
        ))}
      </div>

      {!hasDocs ? (
        <EmptyProductState
          title="Empieza por el expediente"
          description="Con vida laboral y bases, MIOP puede proponer la mejor estrategia de pensión."
        />
      ) : top ? (
        <Card className="border-2 border-foreground/15">
          <CardHeader>
            <CardTitle className="text-base">Próximo paso sugerido (MIOP)</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Barrido {miop!.strategiesEvaluated} estrategias · score {top.score}/100
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-lg font-semibold leading-snug">{top.outcome.strategyName}</p>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-xs">Pensión est.</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {top.outcome.pensionMensual != null
                    ? formatCurrency(top.outcome.pensionMensual)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Jubilación</dt>
                <dd className="mt-1 font-medium">
                  {top.outcome.retirementDate
                    ? format(new Date(top.outcome.retirementDate), 'dd/MM/yyyy')
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Estrategias</dt>
                <dd className="mt-1 font-medium tabular-nums">{miop!.strategiesEvaluated}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link href="/miop">
                <Button size="sm">Ver podio completo</Button>
              </Link>
              <Link href="/jubilacion">
                <Button size="sm" variant="secondary">
                  Detalle jubilación
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyProductState
          title="Sin estrategia todavía"
          description="Revisa que el expediente tenga bases suficientes y vuelve a MIOP."
          href="/miop"
          cta="Ir a MIOP"
        />
      )}

      <p className="print-footer">
        {product.name} · {new Date().toLocaleString('es-ES')}
      </p>
    </div>
  );
}
