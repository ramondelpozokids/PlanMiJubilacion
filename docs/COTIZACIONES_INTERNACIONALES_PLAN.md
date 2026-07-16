# Cotizaciones Internacionales — Investigación y Plan de Implementación

Fecha: 2026-07-16  
Estado: Fase 1 y 2 completadas (investigación + análisis funcional), implementación pendiente de validación.

---

## 1) Alcance y principios

- Este módulo **no sustituye** el cálculo español actual; lo complementa.
- Nunca se estimará importe de pensión extranjera sin fuente oficial/calculadora fiable del país.
- El módulo debe priorizar trazabilidad: para cada conclusión, indicar regla aplicada (UE, bilateral, CMISS, sin coordinación).
- Si faltan datos, se mostrará advertencia explícita y pasos siguientes.

---

## 2) Investigación normativa (fuentes oficiales)

## 2.1 Marco UE/EEE/Suiza (y Reino Unido con marco específico)

Base normativa principal:

- Reglamento (CE) 883/2004 (coordinación de sistemas de Seguridad Social).
- Reglamento (CE) 987/2009 (normas de aplicación).
- Portal oficial Comisión Europea (coordinación de Seguridad Social).
- Seguridad Social española: trámites de pensión por Reglamentos Comunitarios.

Conclusiones clave:

- Se aplica coordinación, no unificación: cada país mantiene sus reglas.
- Principio de **totalización de periodos** para acreditar derecho.
- Principio de **prorrata temporis**: cada país paga su parte.
- Solicitud normalmente en el país de residencia, que coordina con el resto.
- La fecha y cuantía pueden diferir entre países.

## 2.2 Convenios bilaterales de España

Fuentes oficiales prioritarias:

- Seguridad Social (sección oficial de convenios bilaterales/publicaciones).
- Seguridad Social (servicios de pensiones por Convenios Bilaterales/CMISS).
- Ministerio de Inclusión (notas y desarrollo de convenios concretos).

Listado de países con convenio bilateral identificado en fuentes oficiales de la Seguridad Social:

- Andorra
- Argentina
- Australia
- Brasil
- Cabo Verde
- Canadá (salvo Quebec, según convenio)
- Chile
- Colombia
- Corea (República de Corea)
- Ecuador
- Estados Unidos
- Filipinas
- Japón
- Marruecos
- México
- Paraguay
- Perú
- República Dominicana
- Rusia
- Túnez
- Ucrania
- Uruguay
- Venezuela

Notas:

- Además existe el **Convenio Multilateral Iberoamericano (CMISS)** para países adheridos.
- Cuando coexisten bilateral y CMISS, suele aplicarse el instrumento más favorable al interesado según regla aplicable.
- Reino Unido no entra ya por marco UE; debe tratarse con su régimen específico de coordinación posterior al Brexit.

## 2.3 Procedimiento oficial INSS

Fuentes:

- Formulario de jubilación por Reglamentos Comunitarios (UE).
- Formulario de jubilación por Convenios Bilaterales/CMISS.
- Trámite INSS sin certificado y con identificación electrónica.

Datos operativos relevantes:

- Existen formularios distintos según marco jurídico (UE vs bilateral/CMISS).
- Se admiten trámites electrónicos y por registro/presencial según canal.
- Se exige identificación (DNI/NIE/pasaporte según caso), y documentación anexa del trámite.

## 2.4 Intercambio documental / formularios internacionales

Fuentes:

- Your Europe (formularios de coordinación, p. ej. PD P1).
- Seguridad Social y material oficial sobre procedimiento.

Conclusión:

- El sistema intercambia datos entre instituciones; el usuario debe aportar base documental suficiente para iniciar y sostener el expediente.
- El documento P1 resume decisiones de pensión por país en casos coordinados UE.

---

## 3) Análisis funcional (respuestas requeridas)

## 3.1 ¿Qué países permiten totalizar cotizaciones?

En el contexto del producto:

- **UE/EEE/Suiza**: sí, por Reglamentos 883/2004 y 987/2009.
- **Países con convenio bilateral con España**: sí, en términos que marque cada convenio.
- **CMISS**: sí, para Estados parte y dentro de su alcance material.

## 3.2 ¿Qué países tienen convenio bilateral con España?

Actualmente, los listados oficiales consultados reflejan los 23 países enumerados en la sección 2.2.  
Implementación recomendada: mantener catálogo versionado y actualizable sin desplegar código.

## 3.3 ¿Qué países no permiten dicha totalización?

- Países fuera de UE/EEE/Suiza, fuera de bilateral con España y fuera de CMISS aplicable.
- En esos casos, para el cálculo español automatizado, las cotizaciones exteriores no deben sumarse automáticamente.

## 3.4 ¿Qué documentación suele necesitar el usuario?

Mínimo funcional para iniciar análisis en la app:

- País/es de cotización extranjera.
- Periodo aproximado por país (inicio/fin).
- Situación actual (si sigue cotizando allí).
- Si ya solicitó pensión en ese país.
- Identificadores administrativos del país (si los conserva).
- Documentos probatorios disponibles (certificados, resoluciones, historia laboral extranjera, cartas organismo).

Documentación formal para trámite oficial (dependiente del procedimiento):

- Identificación personal y representación (si aplica).
- Formularios oficiales del régimen correspondiente (UE o bilateral/CMISS).
- Anexos exigidos por INSS y por el país contraparte.

## 3.5 ¿Qué advertencias legales deben mostrarse?

- “Este resultado es una estimación orientativa y no sustituye la resolución del INSS ni del organismo extranjero competente.”
- “Cada país aplica su normativa de edad, carencia, cálculo y compatibilidades.”
- “La existencia de coordinación no garantiza importe ni fecha idéntica en todos los países.”
- “PlanMiJubilación no emite reconocimiento oficial de derechos.”

## 3.6 ¿Qué limitaciones existen?

- Falta de acceso programático a cálculos oficiales extranjeros.
- Diferencias de normativa por país y cambios legislativos.
- Retrasos y asimetría documental en intercambio internacional.
- Casos complejos (múltiples regímenes, carreras solapadas, periodos no acreditados).

---

## 4) Diseño UX (asistente simple)

Flujo aprobado para implementar:

1. ¿Ha trabajado fuera de España? (Sí/No)
2. Selección múltiple de países.
3. Por país:
   - País
   - Años cotizados (o rango estimado)
   - Fechas aproximadas
   - Si sigue cotizando
   - Si ya solicitó pensión
4. Pantalla explicativa simple sobre totalización y prorrata por país.

Reglas UX:

- Si responde “No”, continuar flujo actual sin fricción.
- Si responde “Sí”, activar módulo internacional y advertencias.
- Mantener lenguaje no técnico y CTA claros: “Qué hacer ahora”.

---

## 5) Diseño técnico (sin romper cálculo actual)

## 5.1 Módulo nuevo independiente

Propuesta de dominio:

- `lib/international-coordination/catalog.ts`
- `lib/international-coordination/rules.ts`
- `lib/international-coordination/evaluate.ts`
- `lib/international-coordination/types.ts`

Salida esperada del evaluador:

- `coordinationType`: `eu_eea_ch` | `bilateral` | `cmiss` | `none` | `unknown`
- `totalizationPossible`: boolean
- `legalBasis`: referencia de norma/catálogo
- `warnings`: string[]
- `nextSteps`: string[]
- `foreignPensionEstimable`: siempre `false` por defecto

## 5.2 Integración con informe

Nuevo bloque:

- Título: **Cotizaciones internacionales**
- Contenido:
  - Países detectados
  - Años cotizados declarados
  - Posibilidad de totalización
  - Tipo de convenio/marco
  - Posible derecho a pensiones múltiples
  - Recomendaciones de solicitud

---

## 6) Consulta premium: “Revisión internacional de jubilación”

## 6.1 Estudio de mercado (evidencia recopilada)

Se han revisado páginas de mercado español con precios públicos visibles (asesorías y despachos que publican tarifa).  
Rango observado en la muestra:

- Servicios básicos de cálculo/simulación: entorno de 40–70 EUR.
- Estudios completos y tramitación: entorno de 150–300 EUR.
- Casos complejos/especializados: importes superiores (según alcance).

Ejemplos de muestra consultada (no oficiales, solo mercado):

- VYA Asesores (simulación y tramitación).
- Volvemos.org (jubilaciones internacionales).
- Campmany Abogados (estudio + cálculo + tramitación).
- Otras ofertas online con precio público.

## 6.2 Recomendación comercial (provisional, basada en muestra)

Sin fijar precio definitivo hasta ampliar muestra:

- Precio mínimo rentable orientativo: 29,90–39,90 EUR para informe automático internacional sin revisión humana profunda.
- Precio recomendado con revisión experta/documental: 49,90–79,90 EUR.
- Modalidad premium (caso complejo multi-país + sesión): 99 EUR+.

Importante: validar con más muestra y test comercial A/B antes de fijar catálogo final.

---

## 7) Descuentos por configuración (sin tocar código)

Requisito de producto:

- Estados: `free` | `reduced` | `full`.
- Configurable por feature flags o tabla de precios en base de datos.
- Aplicable por usuario/consulta/campaña sin redeploy.

Implementación recomendada:

- Tabla `pricing_rules` y/o `consultation_pricing_overrides`.
- Resolución de precio en backend según regla activa.
- Auditoría de cambios de precio y motivo.

---

## 8) Facturas, recibos e informe con branding (requisitos)

Se implementará una capa documental con:

- Factura legal (numeración correlativa única, datos fiscales, desglose de impuestos).
- Recibo de pago (no fiscal) con branding.
- Portada de informe profesional con identificador único.
- Historial por cliente: informe + factura + recibo + estado de pago.

Advertencia legal:

- Antes del lanzamiento de facturación, validar con asesor fiscal en España (IVA, requisitos formales y series).

---

## 9) Plan de ejecución propuesto (siguiente fase)

1. Modelo de datos internacional + catálogo de países/marcos.
2. Asistente UX (pasos 1–4) y guardado por expediente/consulta.
3. Evaluador de coordinación internacional (sin cálculo monetario extranjero).
4. Bloque “Cotizaciones internacionales” en informe.
5. Producto premium “Revisión internacional de jubilación” + pricing configurable.
6. Motor de facturas/recibos con numeración correlativa.
7. QA legal/funcional + tests.

---

## 10) Fuentes consultadas (prioridad oficial)

Oficiales:

- Seguridad Social (servicios de pensiones UE y convenios bilaterales/CMISS).
- Sede Seguridad Social (trámites y requisitos).
- BOE / EUR-Lex (Reglamentos 883/2004 y 987/2009).
- Comisión Europea (coordinación de Seguridad Social).
- Portal Your Europe (formularios y orientación operativa UE).
- Ministerio de Inclusión (información institucional sobre convenios).

Mercado (solo para benchmarking de precios):

- Sitios de asesorías/despachos con tarifas públicas visibles.

