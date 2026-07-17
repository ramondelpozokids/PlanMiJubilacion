import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listConsultationCases } from '@/lib/consultation/repository';
import { ConsultationManager } from '@/components/features/consultation-manager';
import { PLANMI_BRAND } from '@/lib/planmi/products';

export const metadata = {
  title: 'Consultas de terceros',
  robots: { index: false },
};

/** Solo fundador: expedientes de amigos/familiares (CRUD). */
export default async function AsesoriaConsultasPage() {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) redirect('/asesoria');

  const cases = await listConsultationCases(profile.id);

  return (
    <div className="space-y-8 max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {PLANMI_BRAND} · Fundador
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Consultas de terceros
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Gestiona expedientes de amigos o familiares (crear, editar, eliminar, documentos).
          </p>
        </div>
        <Link href="/asesoria">
          <Button size="sm" variant="secondary">
            ← Asesoría guiada
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
