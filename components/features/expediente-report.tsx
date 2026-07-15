'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExpedienteDigital } from '@/lib/expediente/types';
import { formatCurrency } from '@/lib/utils';
import { RetirementOutlookCard } from '@/components/features/retirement-outlook-card';
import { Subsidio52Card } from '@/components/features/subsidio-52-card';
import type { RetirementOutlook } from '@/lib/calculator/retirement-outlook';

function Val({ label, field }: { label: string; field: { value: unknown } | null | undefined }) {
  if (!field?.value && field?.value !== 0) return null;
  return (
    <p>
      <strong>{label}:</strong> {String(field.value)}
    </p>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function ExpedienteReport({
  expediente,
  outlook,
}: {
  expediente: ExpedienteDigital;
  outlook?: RetirementOutlook | null;
}) {
  const id = expediente.identificacion;
  const res = expediente.resumen;

  return (
    <div className="space-y-4">
      {outlook && <RetirementOutlookCard outlook={outlook} />}
      {outlook && <Subsidio52Card outlook={outlook} />}

      <Card className="border-accent/30 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-base">Lo que ya extrajimos de tus documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
            <Stat n={expediente.periodos.length} label="Periodos" />
            <Stat n={expediente.bases.length} label="Bases" warn={expediente.bases.length === 0} />
            <Stat n={expediente.prestaciones.length} label="Prestaciones" />
            <Stat n={expediente.resoluciones.length} label="Certificados" />
            <Stat n={expediente.lagunas.length} label="Lagunas" />
            <Stat n={expediente.documentIds.length} label="Docs fusionados" />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Completitud {expediente.completitud.score}% · Fuente de verdad unificada (no hace falta
            abrir los PDF).
          </p>
        </CardContent>
      </Card>

      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="text-base">Identificación y resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground mb-2">Identificación</p>
            <Val label="Nombre" field={id.nombre} />
            <Val label="DNI" field={id.dni} />
            <Val label="NIE" field={id.nie} />
            <Val label="Nº afiliación" field={id.numeroAfiliacion} />
            <Val label="Fecha nacimiento" field={id.fechaNacimiento} />
            <Val label="Edad" field={id.edad} />
            <Val label="Dirección" field={id.direccion} />
            <Val label="Localidad" field={id.localidad} />
            <Val label="Provincia" field={id.provincia} />
            <Val label="CP" field={id.codigoPostal} />
          </div>
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground mb-2">Resumen cotización</p>
            <Val label="Años cotizados" field={res.anosCotizados} />
            <Val label="Meses" field={res.mesesCotizados} />
            <Val label="Total días" field={res.totalDiasCotizacion} />
            <Val label="Régimen" field={res.regimenPrincipal} />
            <Val label="Situación actual" field={res.situacionActual} />
            <Val label="Empresa actual" field={res.empresaActual} />
            {res.baseMensualActual?.value != null && (
              <p>
                <strong>Base mensual:</strong> {formatCurrency(Number(res.baseMensualActual.value))}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {expediente.advisor && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="text-base">Interpretación IA</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <p>{expediente.advisor.summary}</p>
            {expediente.advisor.risks.length > 0 && (
              <div>
                <p className="font-medium text-warning">Riesgos</p>
                <ul className="list-disc pl-5 mt-1">
                  {expediente.advisor.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            {expediente.advisor.opportunities.length > 0 && (
              <div>
                <p className="font-medium">Siguiente paso</p>
                <ul className="list-disc pl-5 mt-1">
                  {expediente.advisor.opportunities.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(expediente.pendingQuestions?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Solo necesitamos esto de ti</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {expediente.pendingQuestions!.map((q) => (
              <div key={q.id} className="border-b border-border/40 pb-2">
                <p>{q.question}</p>
                <p className="text-xs text-muted-foreground">{q.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {expediente.discrepancies.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader>
            <CardTitle className="text-base text-warning">
              Discrepancias detectadas ({expediente.discrepancies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {expediente.discrepancies.map((d) => (
              <div key={d.id} className="border-b border-border/50 pb-2">
                <strong>{d.field}</strong> — {d.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Periodos laborales ({expediente.periodos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {expediente.periodos.length === 0 ? (
            <EmptyHint text="Aún no hay periodos. Sube o relee la vida laboral." />
          ) : (
            <table className="w-full text-sm min-w-[820px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Alta</th>
                  <th className="py-2 pr-2">Baja</th>
                  <th className="py-2 pr-2">Empresa</th>
                  <th className="py-2 pr-2">Régimen</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Días</th>
                  <th className="py-2">Origen</th>
                </tr>
              </thead>
              <tbody>
                {expediente.periodos.map((p) => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">{p.fechaAlta?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.fechaBaja?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.empresa?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.regimen?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.categoria}</td>
                    <td className="py-2 pr-2">{p.diasCotizados?.value ?? '—'}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {p.sources.map((s) => s.documentName).filter(Boolean).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Certificados y resoluciones ({expediente.resoluciones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto text-sm">
          {expediente.resoluciones.length === 0 ? (
            <EmptyHint text="Sin certificados/resoluciones fusionados aún." />
          ) : (
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Organismo</th>
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Resumen</th>
                  <th className="py-2 pr-2">Importe</th>
                  <th className="py-2">Documento</th>
                </tr>
              </thead>
              <tbody>
                {expediente.resoluciones.map((r) => (
                  <tr key={r.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">{r.tipo?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{r.organismo?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{r.fecha?.value ?? '—'}</td>
                    <td className="py-2 pr-2 max-w-xs">{r.resumen?.value ?? '—'}</td>
                    <td className="py-2 pr-2">
                      {r.importe?.value != null ? formatCurrency(Number(r.importe.value)) : '—'}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {r.sources[0]?.documentName ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Prestaciones / paro ({expediente.prestaciones.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto text-sm">
          {expediente.prestaciones.length === 0 ? (
            <EmptyHint text="Sin prestaciones documentadas." />
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Inicio</th>
                  <th className="py-2 pr-2">Fin</th>
                  <th className="py-2 pr-2">Días</th>
                  <th className="py-2 pr-2">Importe</th>
                  <th className="py-2">Origen</th>
                </tr>
              </thead>
              <tbody>
                {expediente.prestaciones.map((p) => (
                  <tr key={p.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">{p.tipo?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.fechaInicio?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.fechaFin?.value ?? '—'}</td>
                    <td className="py-2 pr-2">{p.dias?.value ?? '—'}</td>
                    <td className="py-2 pr-2">
                      {p.importe?.value != null ? formatCurrency(Number(p.importe.value)) : '—'}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {p.sources.map((s) => s.documentName).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bases de cotización ({expediente.bases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1 max-h-96 overflow-y-auto">
          {expediente.bases.length === 0 ? (
            <EmptyHint text="0 meses extraídos. En Documentos (abajo) pulsa Releer en el informe de bases." />
          ) : (
            expediente.bases.map((b) => (
              <p key={b.id}>
                {b.periodo?.value ?? '?'} —{' '}
                {b.base?.value != null ? formatCurrency(Number(b.base.value)) : '—'}
                {b.sources[0]?.documentName ? (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · {b.sources[0].documentName}
                  </span>
                ) : null}
              </p>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lagunas ({expediente.lagunas.length})</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {expediente.lagunas.length === 0 ? (
            <EmptyHint text="Sin lagunas registradas en el expediente." />
          ) : (
            <ul className="space-y-1">
              {expediente.lagunas.map((l, i) => (
                <li key={i}>
                  {l.desde?.value ?? '?'} → {l.hasta?.value ?? '?'}
                  {l.dias?.value != null ? ` · ${l.dias.value} días` : ''}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {expediente.completitud.camposCriticosFaltantes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pendiente de documentos: {expediente.completitud.camposCriticosFaltantes.join(', ')}
        </p>
      )}
    </div>
  );
}

function Stat({ n, label, warn }: { n: number; label: string; warn?: boolean }) {
  return (
    <div className="rounded-md border bg-background px-2 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${warn ? 'text-warning' : ''}`}>{n}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
