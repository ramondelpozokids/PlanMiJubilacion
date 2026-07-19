'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatPriceEur, applyDiscount } from '@/lib/billing/pricing';
import type { DiscountMode, PricingRule } from '@/lib/international-coordination/types';
import { issueDocumentsAction } from '@/app/(app)/informes/actions';
import { toast } from 'sonner';

export function IssueDocumentsForm({
  pricing,
  defaultName,
  defaultEmail,
  isFounder,
  consultationCaseId,
  compactTitle,
}: {
  pricing: PricingRule[];
  defaultName: string;
  defaultEmail: string;
  isFounder: boolean;
  /** Si se indica, la factura queda ligada a esa consulta. */
  consultationCaseId?: string;
  compactTitle?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [serviceKey, setServiceKey] = useState(pricing[0]?.serviceKey ?? 'informe_estandar');
  const [discountMode, setDiscountMode] = useState<DiscountMode>(isFounder ? 'free' : 'full');

  const selected = pricing.find((p) => p.serviceKey === serviceKey) ?? pricing[0];
  const previewCents = selected
    ? applyDiscount(selected.priceCents, isFounder ? discountMode : 'full')
    : 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await issueDocumentsAction(fd);
      toast.success(`Emitidos ${res.invoiceNumber} y ${res.receiptNumber}`);
      router.refresh();
      if (res.invoiceId) router.push(`/informes/${res.invoiceId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al emitir');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-5 space-y-4">
      {consultationCaseId && (
        <input type="hidden" name="consultationCaseId" value={consultationCaseId} />
      )}
      <div>
        <h2 className="font-semibold text-xl">
          {compactTitle ?? 'Crear factura y recibo'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {consultationCaseId
            ? 'La factura, el recibo y la portada quedarán vinculados a esta consulta.'
            : 'Genera al instante factura (FAC-…), recibo (REC-…) y portada (INF-…) con tu logo. Stripe se conectará más adelante.'}
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Servicio</span>
        <select
          name="serviceKey"
          value={serviceKey}
          onChange={(e) => setServiceKey(e.target.value as PricingRule['serviceKey'])}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {pricing.map((p) => (
            <option key={p.serviceKey} value={p.serviceKey}>
              {p.label} — {formatPriceEur(p.priceCents)}
            </option>
          ))}
        </select>
      </label>

      {isFounder && (
        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">Descuento (solo fundador)</legend>
          <div className="flex flex-wrap gap-3 text-sm">
            {(
              [
                ['free', 'Gratuita'],
                ['reduced', 'Precio reducido (50 %)'],
                ['full', 'Precio completo'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="discountMode"
                  value={value}
                  checked={discountMode === value}
                  onChange={() => setDiscountMode(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {!isFounder && <input type="hidden" name="discountMode" value="full" />}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Nombre del cliente</span>
          <input
            name="clientName"
            defaultValue={defaultName}
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Email</span>
          <input
            name="clientEmail"
            type="email"
            defaultValue={defaultEmail}
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">NIF (opcional)</span>
          <input
            name="clientTaxId"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Dirección (opcional)</span>
          <input
            name="clientAddress"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Notas internas (opcional)</span>
        <input
          name="notes"
          placeholder="Ej. familiar, cortesía, caso test"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-sm">
          Importe a documentar:{' '}
          <strong className="tabular-nums text-lg">{formatPriceEur(previewCents)}</strong>
        </p>
        <Button type="submit" size="lg" disabled={pending || !selected}>
          {pending ? 'Creando…' : 'Crear factura + recibo ahora'}
        </Button>
      </div>
    </form>
  );
}
