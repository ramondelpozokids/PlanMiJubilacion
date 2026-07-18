/**
 * Badge de ámbito: plan personal vs consulta de cliente.
 * Evita mezclar visualmente el expediente del fundador con la asesoría.
 */
export function ScopeBadge({
  scope,
  clientName,
}: {
  scope: 'personal' | 'consultation';
  clientName?: string;
}) {
  if (scope === 'personal') {
    return (
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Mi plan · expediente personal
      </p>
    );
  }
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
      Asesoría · consulta de cliente
      {clientName ? ` · ${clientName}` : ''}
    </p>
  );
}
