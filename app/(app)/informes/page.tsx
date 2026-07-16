import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listUserBillingDocuments, listActivePricing } from '@/lib/billing/repository';
import { formatPriceEur } from '@/lib/billing/pricing';
import { ProductPageHeader } from '@/components/features/planmi-suite';
import { IssueDocumentsForm } from '@/components/features/issue-documents-form';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Mis informes y documentos', robots: { index: false } };

function docLabel(type: string) {
  if (type === 'invoice') return 'Factura';
  if (type === 'receipt') return 'Recibo';
  return 'Portada';
}

export default async function InformesPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const founder = hasUnlimitedAccess(profile);
  const [docs, pricing] = await Promise.all([
    listUserBillingDocuments(profile.id),
    listActivePricing(),
  ]);

  return (
    <div className="space-y-8 max-w-4xl">
      <ProductPageHeader
        name="Informes y documentos"
        tagline="Facturas, recibos e historial de informes"
        actions={
          <Link href="/jubilacion">
            <Button size="sm" variant="secondary">
              Volver a jubilación
            </Button>
          </Link>
        }
      />

      <IssueDocumentsForm
        pricing={pricing}
        defaultName={profile.full_name ?? ''}
        defaultEmail={profile.email ?? ''}
        isFounder={founder}
      />

      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Tarifas actuales</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Modificables en Supabase sin cambiar código (`pricing_rules`).
        </p>
        <ul className="mt-4 divide-y text-sm">
          {pricing.map((p) => (
            <li key={p.serviceKey} className="flex justify-between py-3 gap-4">
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-muted-foreground">{p.description}</p>
              </div>
              <span className="tabular-nums font-medium shrink-0">
                {formatPriceEur(p.priceCents)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Historial</h2>
        {docs.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aún no hay documentos. Usa el formulario de arriba para emitir factura, recibo y
            portada.
          </p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {docs.map((d) => {
              const amount =
                typeof d.payload.totalCents === 'number'
                  ? formatPriceEur(d.payload.totalCents)
                  : null;
              return (
                <li key={d.id}>
                  <Link
                    href={`/informes/${d.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <span>
                      <span className="font-medium">{docLabel(d.docType)}</span>{' '}
                      {d.docNumber}
                      {amount ? (
                        <span className="text-muted-foreground"> · {amount}</span>
                      ) : null}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(d.createdAt).toLocaleString('es-ES')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
