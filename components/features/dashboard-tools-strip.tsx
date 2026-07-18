import Link from 'next/link';

/** Atajos de Mi plan (Ramón) en el dashboard. */
const MY_PLAN_TOOLS = [
  { href: '/upload', label: 'Documentos', hint: 'Subir PDFs propios' },
  { href: '/analysis', label: 'Expediente', hint: 'Datos extraídos' },
  { href: '/asesoria', label: 'Simulación guiada', hint: 'Tu plan paso a paso' },
  { href: '/miop', label: 'MIOP', hint: 'Optimización' },
  { href: '/comparator', label: 'Simulador', hint: 'Escenarios' },
  { href: '/informes', label: 'Informes y pagos', hint: 'Facturas / recibos' },
  { href: '/calendar', label: 'Calendario', hint: 'Fechas clave' },
  { href: '/settings', label: 'Ajustes', hint: 'Cuenta y privacidad' },
] as const;

const FOUNDER_INBOX = {
  href: '/asesoria/mensajes',
  label: 'Bandeja de contacto',
  hint: 'Mensajes del formulario público',
} as const;

export function DashboardToolsStrip({ isFounder = false }: { isFounder?: boolean }) {
  const tools = isFounder ? [...MY_PLAN_TOOLS, FOUNDER_INBOX] : [...MY_PLAN_TOOLS];

  return (
    <section className="rounded-xl border bg-card p-4 sm:p-5 print:hidden">
      <div className="mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Mi plan · Ramón del Pozo Rott
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">Accesos rápidos</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Todo lo tuyo aquí. Los familiares (p. ej. Carlos) van en Amigos y familiares → Consultas.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border px-3 py-3 transition-colors hover:border-accent/40 hover:bg-accent/5"
          >
            <p className="text-sm font-medium">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
