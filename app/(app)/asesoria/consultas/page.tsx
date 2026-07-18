import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listConsultationCases } from '@/lib/consultation/repository';
import { ConsultationManager } from '@/components/features/consultation-manager';
import { ScopeBadge } from '@/components/features/scope-badge';
import { PLANMI_BRAND } from '@/lib/planmi/products';

export const metadata = {
  title: 'Consultas de amigos y familiares',
  robots: { index: false },
};

/** Solo fundador: expedientes de clientes (nunca el plan personal de Ramón). */
export default async function AsesoriaConsultasPage() {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) redirect('/asesoria');

  const cases = await listConsultationCases(profile.id);

  return (
    <div className="space-y-8 max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <ScopeBadge scope="consultation" />
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Consultas de amigos y familiares
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Expedientes de terceros. Cada consulta tiene su propio escenario. No se mezcla con tu
            plan personal ({PLANMI_BRAND} · Ramón del Pozo Rott).
          </p>
          <p className="mt-2 rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-xs text-muted-foreground max-w-2xl">
            Tu jubilación está en <strong>Mi plan → Jubilación</strong>. Aquí solo gestionas a otras
            personas.
          </p>
        </div>
        <Link href="/jubilacion">
          <Button size="sm" variant="secondary">
            Ir a mi plan personal
          </Button>
        </Link>
      </header>

      <ConsultationManager
        cases={cases.map((c) => ({
          id: c.id,
          clientName: c.clientName,
          clientNote: c.clientNote,
          clientBirthDate: c.clientBirthDate,
        }))}
      />
    </div>
  );
}
