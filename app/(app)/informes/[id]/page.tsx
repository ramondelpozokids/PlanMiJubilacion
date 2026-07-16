import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getBillingDocumentForUser } from '@/lib/billing/issue';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Documento', robots: { index: false } };

export default async function BillingDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const doc = await getBillingDocumentForUser(profile.id, params.id);
  if (!doc) notFound();

  const label =
    doc.doc_type === 'invoice'
      ? 'Factura'
      : doc.doc_type === 'receipt'
        ? 'Recibo'
        : 'Portada de informe';

  return (
    <div className="space-y-4 max-w-4xl print-root">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">{doc.doc_number}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/informes/${doc.id}/raw`} target="_blank" rel="noreferrer">
            <Button size="sm">Abrir / imprimir PDF</Button>
          </a>
          <Link href="/informes">
            <Button size="sm" variant="secondary">
              Volver al historial
            </Button>
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground print:hidden">
        Pulsa <strong>Abrir / imprimir PDF</strong> y usa Imprimir → Guardar como PDF en el
        navegador.
      </p>

      {doc.html_snapshot ? (
        <iframe
          title={doc.doc_number}
          src={`/informes/${doc.id}/raw`}
          className="w-full min-h-[900px] rounded-xl border bg-white"
        />
      ) : (
        <p className="text-muted-foreground">Documento sin contenido HTML.</p>
      )}
    </div>
  );
}
