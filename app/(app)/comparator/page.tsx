import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getProfile, createClient } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import { buildRetirementOutlook } from '@/lib/calculator/retirement-outlook';
import { resolveExpedienteAsOf } from '@/lib/expediente/as-of';
import { RetirementOutlookCard } from '@/components/features/retirement-outlook-card';
import { Subsidio52Card } from '@/components/features/subsidio-52-card';
import { RetirementDateCalendar } from '@/components/features/retirement-date-calendar';
import type { ScenarioRow } from '@/components/features/scenario-simulator';
import { deriveSubsidio52Amounts, getSubsidio52Config } from '@/lib/rules/subsidio-52';
import { addYears, format } from 'date-fns';
import { ReportToolbar } from '@/components/features/print-button';

export const metadata = { title: 'Simulador', robots: { index: false } };

export default async function ComparatorPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const expediente = await loadExpediente(profile!.id);
  const outlook = expediente
    ? buildRetirementOutlook(expediente, resolveExpedienteAsOf(expediente))
    : null;

  const { data: scenarioRows } = await supabase
    .from('scenarios')
    .select('*')
    .eq('user_id', profile!.id)
    .order('created_at', { ascending: false });

  const scenarios = (scenarioRows ?? []) as ScenarioRow[];

  const lastDocBase = deriveSubsidio52Amounts(getSubsidio52Config(2027)).baseCotizacion;

  const today = new Date();
  const ordinaryDate = outlook?.ordinary.date ?? addYears(today, 8);
  const birth = outlook?.birthDate
    ? new Date(outlook.birthDate + 'T12:00:00')
    : null;
  const age65Date = birth ? addYears(birth, 65) : ordinaryDate;
  const earliest = outlook?.earlyVoluntary.earliestEligibleDate ?? null;

  const minCandidate = earliest && earliest > today ? earliest : today;
  const minDate = format(minCandidate, 'yyyy-MM-dd');
  const maxDate = format(birth ? addYears(birth, 70) : addYears(today, 15), 'yyyy-MM-dd');
  const defaultRetirementDate = format(ordinaryDate, 'yyyy-MM-dd');

  return (
    <div className="space-y-6 print-root">
      <ReportToolbar
        title="Simulador de jubilación"
        subtitle="Presente = informe de bases. Futuro = desempleo → subsidio mayores de 52. La simulación SS es solo referencia."
      />

      {outlook && <RetirementOutlookCard outlook={outlook} />}
      {outlook && <Subsidio52Card outlook={outlook} />}

      {expediente && outlook ? (
        <RetirementDateCalendar
          defaultDate={defaultRetirementDate}
          ordinaryDate={format(ordinaryDate, 'yyyy-MM-dd')}
          earliestDate={earliest ? format(earliest, 'yyyy-MM-dd') : null}
          age65Date={format(age65Date, 'yyyy-MM-dd')}
          minDate={minDate}
          maxDate={maxDate}
          defaultBase={Number(lastDocBase)}
          scenarios={scenarios}
        />
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm space-y-3">
            <p>Necesitamos el expediente (vida laboral + bases).</p>
            <Link href="/upload">
              <Button>Subir documentos</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
