import type { DocumentTypeKey } from '@/lib/expediente/document-types';

/** Instrucciones específicas por tipo documental para la extracción IA. */
export function getExtractionPromptForType(documentType: DocumentTypeKey): string {
  const prompts: Partial<Record<DocumentTypeKey, string>> = {
    vida_laboral: `INFORME DE VIDA LABORAL SS: extrae TODOS los periodos (alta/baja, empresa, CCC, régimen, días), prestaciones paro, autónomos, lagunas, identificación completa.`,
    bases_cotizacion: `INFORME DE BASES DE COTIZACIÓN (SS):
- Extrae CADA mes REAL ya cotizado: periodo MM/YYYY + importe de base + régimen/empresa si aparece.
- Rellena el array basesCotizacion SOLO con meses ≤ fecha de hoy (mes en curso inclusive si ya consta).
- PROHIBIDO incluir meses futuros, proyecciones, simulaciones o periodos "hasta el presente" / "hasta la jubilación".
- Si el PDF muestra columnas o filas proyectadas hacia el futuro, IGNÓRALAS.
- No inventes bases. Si un mes no aparece claramente, no lo pongas.`,
    nomina: `NÓMINA: extrae empresa, trabajador, DNI/NAF, periodo (mes/año), salario bruto, base cotización, grupo cotización, tipo contrato. Crea un periodo en periodosContrato con fechas del mes. Pon salario en otrosDatos.salarioBruto y base en otrosDatos.baseCotizacion.`,
    resolucion_inss: `RESOLUCIÓN INSS: extrae SIEMPRE organismo (INSS), nº expediente, fecha resolución (DD/MM/YYYY), tipo (jubilación, incapacidad…), importe €, resumen en 1 frase. Obliga: otrosDatos.resolucion = { organismo, numeroExpediente, fecha, tipo, resumen, importe }.`,
    resolucion_sepe: `RESOLUCIÓN / CERTIFICADO SEPE-SPEE: extrae organismo SEPE, nº expediente, fechas inicio/fin prestación, tipo, importe mensual €, resumen. Obliga otrosDatos.resolucion completo Y prestacionesDesempleo si hay paro.`,
    prestacion_desempleo: `PRESTACIÓN DESEMPLEO: extrae fechas inicio/fin (DD/MM/YYYY), días, tipo, importe mensual €, situación. Rellena prestacionesDesempleo. Si hay nº expediente, otrosDatos.numeroExpediente.`,
    certificado_empresa: `CERTIFICADO DE EMPRESA: extrae empresa, CCC, fechas alta y baja (DD/MM/YYYY), tipo contrato, grupo cotización, salario/base si consta, fecha del certificado. Crea periodosContrato. Pon fecha del documento en resumen.fechaInforme. otrosDatos.resolucion con tipo certificado_empresa, fecha, resumen (empresa + fechas).`,
    simulacion_jubilacion: `SIMULACIÓN DE JUBILACIÓN (SS / INSS) — documento oficial:
- Extrae SIEMPRE: edad de jubilación, fecha de jubilación, pensión mensual estimada (€), base reguladora (€), años/meses cotizados, porcentaje aplicado.
- Pon TODO en otrosDatos.simulacion = { edadJubilacion, fechaJubilacion (DD/MM/YYYY), pensionMensual, pensionAnual, baseReguladora, anosCotizados, mesesCotizados, porcentaje }.
- No inventes cifras. Solo lo que aparece en el PDF.`,
    subsidio: `SUBSIDIO: extrae tipo, fechas, importe, organismo. prestacionesDesempleo o otrosDatos.subsidio.`,
    convenio_especial: `CONVENIO ESPECIAL: extrae fechas, importe mensual, años reconocidos. periodosContrato categoría convenio en otrosDatos.`,
    incapacidad_temporal: `INCAPACIDAD TEMPORAL: fechas baja/alta, empresa, tipo IT, base reguladora prestación.`,
    incapacidad_permanente: `INCAPACIDAD PERMANENTE: grado, fecha efectos, base, resolución en otrosDatos.resolucion.`,
    certificado_europeo: `CERTIFICADO EUROPEO A1/E101: países, periodos, institución. periodosContrato con régimen internacional.`,
    declaracion_fiscal: `DECLARACIÓN FISCAL: renta anual, rendimientos trabajo si útil para salario anual en otrosDatos.`,
  };

  return prompts[documentType] ?? `Documento Seguridad Social (${documentType}): extrae toda información laboral, cotización, fechas, importes e identificación.`;
}
