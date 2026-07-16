import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listConsultationCases } from '@/lib/consultation/repository';
import { ConsultationManager } from '@/components/features/consultation-manager';
import { PLANMI_BRAND } from '@/lib/planmi/products';

export const metadata = { title: 'Asesoría fundador', robots: { index: false } };

export default async function AsesoriaPage() {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) redirect('/dashboard');

  const cases = await listConsultationCases(profile.id);

  return (
    <div className="space-y-8 max-w-7xl">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {PLANMI_BRAND} · Fundador
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Asesoría gratuita</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Simula la jubilación de un amigo o familiar con sus documentos. Incluye cotizaciones en
          España y en el extranjero (p. ej. Alemania): introduce el importe de la carta extranjera
          y se suma a la estimación española. Solo tú (Ramón) tienes acceso.
        </p>
      </header>

      <ConsultationManager cases={cases.map((c) => ({ id: c.id, clientName: c.clientName }))} />

      {cases.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Consultas abiertas</h2>
          <ul className="divide-y rounded-xl border">
            {cases.map((c) => {
              const hasIntl = Boolean(
                c.expediente.internationalCotizaciones?.hasWorkedAbroad
              );
              return (
                <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium">{c.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      Expediente {c.completitudScore}% ·{' '}
                      {new Date(c.updatedAt).toLocaleString('es-ES')}
                      {hasIntl ? ' · Internacional' : ''}
                    </p>
                  </div>
                  <Link
                    href={`/asesoria/${c.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Ver informe →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

    </div>
  );
}
