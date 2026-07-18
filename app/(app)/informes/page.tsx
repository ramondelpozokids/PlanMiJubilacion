import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listUserBillingDocuments, listActivePricing } from '@/lib/billing/repository';
import { ProductPageHeader } from '@/components/features/planmi-suite';
import { IssueDocumentsForm } from '@/components/features/issue-documents-form';
import { BillingHistoryPanel } from '@/components/features/billing-history-panel';
import { PricingTable } from '@/components/features/pricing-table';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Mis informes y documentos', robots: { index: false } };

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
        tagline="Crear y guardar facturas / recibos, con historial por tipo"
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

      <PricingTable pricing={pricing} />

      <BillingHistoryPanel documents={docs} />
    </div>
  );
}
