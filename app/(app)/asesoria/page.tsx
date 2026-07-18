import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { loadExpediente } from '@/lib/expediente/repository';
import { AsesoriaSimulationWizard } from '@/components/features/asesoria-wizard/asesoria-simulation-wizard';

export const metadata = {
  title: 'Simulación guiada',
  description:
    'Simulación de jubilación guiada sobre tu expediente personal: fecha de nacimiento, vida laboral, bases y cotizaciones en el extranjero.',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

export default async function AsesoriaPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const expediente = await loadExpediente(profile.id);
  const isFounder = hasUnlimitedAccess(profile);

  return (
    <AsesoriaSimulationWizard
      initialExpediente={expediente}
      initialInternational={expediente?.internationalCotizaciones ?? null}
      isFounder={isFounder}
    />
  );
}
