import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/lib/supabase/server';
import { loadExpediente } from '@/lib/expediente/repository';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Calendario', robots: { index: false } };

export default async function CalendarPage() {
  const profile = await getProfile();
  const expediente = await loadExpediente(profile!.id);

  const milestones: Array<{ date: string; label: string; detail: string }> = [];

  for (const p of expediente?.periodos.slice(0, 20) ?? []) {
    if (p.fechaAlta?.value) {
      milestones.push({
        date: p.fechaAlta.value,
        label: `Alta · ${p.empresa?.value ?? 'Empresa'}`,
        detail: p.fechaBaja?.value
          ? `Hasta ${p.fechaBaja.value}${p.diasCotizados?.value != null ? ` · ${p.diasCotizados.value} días` : ''}`
          : 'Periodo abierto',
      });
    }
  }

  for (const lag of expediente?.lagunas.slice(0, 10) ?? []) {
    if (lag.desde?.value) {
      milestones.push({
        date: lag.desde.value,
        label: 'Laguna de cotización (documentada)',
        detail: `Hasta ${lag.hasta?.value ?? '—'} · ${lag.dias?.value ?? '?'} días`,
      });
    }
  }

  for (const pr of expediente?.prestaciones.slice(0, 10) ?? []) {
    if (pr.fechaInicio?.value) {
      milestones.push({
        date: pr.fechaInicio.value,
        label: pr.tipo?.value ?? 'Prestación',
        detail: pr.fechaFin?.value ? `Hasta ${pr.fechaFin.value}` : 'Sin fecha fin',
      });
    }
  }

  milestones.sort((a, b) => {
    const pa = a.date.split('/').reverse().join('');
    const pb = b.date.split('/').reverse().join('');
    return pa.localeCompare(pb);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Calendario documental</h1>
        <p className="text-muted-foreground mt-2">
          Fechas reales de tu expediente. Sin proyección de jubilación (aún te faltan años).
        </p>
      </header>

      {milestones.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin fechas todavía</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Sube vida laboral u otros documentos.</p>
            <Link href="/upload">
              <Button>Subir documentos</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <p className="text-sm text-muted-foreground">{m.date}</p>
                <p className="font-medium mt-1">{m.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{m.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
