'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FullDocumentExtraction, VidaLaboralCompleta } from '@/lib/ai/vida-laboral-types';
import { formatCotizacionLabel } from '@/lib/ai/parse-seg-social';
import { formatCurrency } from '@/lib/utils';
import { isFullDocumentExtraction } from '@/lib/ai/vida-laboral-types';

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') return null;
  return (
    <p>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function PeriodosTable({
  title,
  rows,
}: {
  title: string;
  rows: VidaLaboralCompleta['periodosContrato'];
}) {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {title} ({rows.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3">Alta</th>
              <th className="py-2 pr-3">Baja</th>
              <th className="py-2 pr-3">Empresa</th>
              <th className="py-2 pr-3">CCC</th>
              <th className="py-2 pr-3">Régimen</th>
              <th className="py-2 pr-3">Situación</th>
              <th className="py-2">Días</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 pr-3 whitespace-nowrap">{r.fechaAlta ?? '—'}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.fechaBaja ?? '—'}</td>
                <td className="py-2 pr-3">{r.empresa ?? '—'}</td>
                <td className="py-2 pr-3 text-xs">{r.ccc ?? '—'}</td>
                <td className="py-2 pr-3">{r.regimen ?? '—'}</td>
                <td className="py-2 pr-3">{r.situacion ?? '—'}</td>
                <td className="py-2">{r.diasCotizados ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function VidaLaboralReport({ data }: { data: FullDocumentExtraction | unknown }) {
  if (!isFullDocumentExtraction(data)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Pulsa <strong>Releer</strong> para extraer el informe completo del PDF.
        </CardContent>
      </Card>
    );
  }

  const ic = data.informeCompleto;
  const id = ic.identificacion;
  const res = ic.resumen;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos identificativos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field label="Nombre" value={id.nombre} />
            <Field label="DNI" value={id.dni} />
            <Field label="NIE" value={id.nie} />
            <Field label="Nº afiliación" value={id.numeroAfiliacion} />
            <Field label="Fecha nacimiento" value={id.fechaNacimiento} />
            <Field label="Edad" value={id.edad} />
            <Field label="Dirección" value={id.direccion} />
            <Field label="Localidad" value={id.localidad} />
            <Field label="Provincia" value={id.provincia} />
            <Field label="C.P." value={id.codigoPostal} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumen cotización</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Field
              label="Total cotizado"
              value={formatCotizacionLabel(res.anosCotizados, res.mesesCotizados)}
            />
            <Field label="Total días cotización" value={res.totalDiasCotizacion} />
            <Field label="Régimen principal" value={res.regimenPrincipal} />
            <Field label="Situación actual" value={res.situacionActual} />
            <Field label="Fecha informe" value={res.fechaInforme} />
            <Field
              label="Páginas leídas"
              value={`${ic.paginasProcesadas} · ${ic.totalPeriodosExtraidos} registros extraídos`}
            />
            <Field
              label="Confianza"
              value={data.confidence ? `${Math.round(data.confidence * 100)}%` : null}
            />
          </CardContent>
        </Card>
      </div>

      <PeriodosTable title="Contratos — empresas (altas y bajas)" rows={ic.periodosContrato} />
      <PeriodosTable title="Autónomos / RETA" rows={ic.periodosAutonomo} />
      <PeriodosTable title="Situaciones asimiladas a la alta" rows={ic.situacionesAsimiladas} />

      {ic.prestacionesDesempleo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prestaciones por desempleo ({ic.prestacionesDesempleo.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[520px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Inicio</th>
                  <th className="py-2 pr-3">Fin</th>
                  <th className="py-2 pr-3">Días</th>
                  <th className="py-2">Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {ic.prestacionesDesempleo.map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-3">{p.tipo ?? '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.fechaInicio ?? '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{p.fechaFin ?? '—'}</td>
                    <td className="py-2 pr-3">{p.dias ?? '—'}</td>
                    <td className="py-2">{p.observaciones ?? p.situacion ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {ic.lagunas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lagunas ({ic.lagunas.length})</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {ic.lagunas.map((l, i) => (
              <p key={i}>
                {l.desde ?? '?'} → {l.hasta ?? '?'}
                {l.dias != null ? ` (${l.dias} días)` : ''}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {ic.basesCotizacion.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Bases de cotización ({ic.basesCotizacion.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-4">Periodo</th>
                  <th className="py-2 pr-4">Base</th>
                  <th className="py-2">Régimen</th>
                </tr>
              </thead>
              <tbody>
                {ic.basesCotizacion.map((b, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 pr-4">{b.periodo ?? '—'}</td>
                    <td className="py-2 pr-4">
                      {b.base != null ? formatCurrency(b.base) : '—'}
                    </td>
                    <td className="py-2">{b.regimen ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
