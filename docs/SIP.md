# Social Intelligence Platform (SIP) — PlanMiJubilacion v1.0

> **Fase 0 VALIDADA** — 2026-07-15  
> PlanMiJubilacion es la **primera aplicación** sobre el motor SIP.  
> No prototipo. No CRUD. Plataforma profesional de inteligencia documental + reglas SS.

---

## Decisiones bloqueadas (Fase 0)

| # | Decisión | Valor |
|---|----------|--------|
| 1 | Arquitectura objetivo | SIP modular: apps sobre motor (`expediente`, `validation`, `calculator`, `document-intelligence`) |
| 2 | Orden de trabajo | Fase 0 → 1 → 2 → 3 → 4 → 5 (sin saltar) |
| 3 | ERP subsidio +52 | Cadena fija IPREM×% → bruto → neto → base → impacto → comparativa → informe. También unificado en Motor Económico. |
| 7 | MIOP (4 motores) | **Documental** \| **Reglas** (`economic-params.json`) \| **Cálculo** (`evaluateScenario`) \| **Optimización** (`lib/optimization`). Cálculo ≠ recomendación. Fase 3.5+4 = grid amplio + podio `/miop`. |
| 4 | Cola async (hasta Fase 2) | Mejorar fire-and-forget en Next.js; workers reales en Fase 2 (Inngest/pg_cron) |
| 5 | Fuente de verdad | Solo `expedientes.data`. `extracted_data` = legacy deprecado (sin writes) |
| 6 | Cálculo | Nunca dentro de OCR/merge. Job `recalculate(userId)` post-expediente (+ `runMiop`) |

---

## Principios innegociables

1. Los documentos son **fuentes de datos**, no la verdad.
2. El **expediente digital** es la única fuente de verdad.
3. Cálculo y OCR **nunca** se acoplan.
4. No pedir al usuario un dato que esté en documentos.
5. Arquitectura lista para incapacidad, viudedad, IMV… **sin rediseñar**.

---

## Capas objetivo

```
Apps: PlanMiJubilacion | PlanMisPrestaciones | …
         │
    sip-api (REST futura)
         │
 ┌───────┴──────────────────────────────────────┐
 │ sip-document-intelligence │ sip-expediente   │
 │ sip-validation            │ sip-calculator   │
 │ sip-rules                 │ sip-reports      │
 └───────┬──────────────────────────────────────┘
         │
 Workers OCR │ Queue │ Storage │ Postgres │ Audit
```

Hoy vive como monolito Next.js en `lib/*` con fronteras de módulo. En Fase 5 se extraen packages.

---

## Fases

| Fase | Estado | Objetivo | Criterio de salida |
|------|--------|----------|--------------------|
| **0** | ✅ Validada | Arquitectura + decisiones | Este documento firmado |
| **1** | ✅ Hecha | Núcleo: SoT, desacoplar calc, tests | Upload → expediente → recalculate → UI coherente |
| **2** | ✅ Validada | Document Intelligence | Hash, enrich SEPE, migration 005 |
| **3** | ✅ Lista | Cálculo + simulador | Escenarios + ERP subsidio |
| **3.5 / 4** | 🔨 En curso | **MIOP** Optimización + podio | Grid amplio + score 100 + `/miop` top-3 |
| **5** | ⏳ | Plataforma SIP | Packages + API + nuevos calculators |

---

## Contratos entre módulos

```
DocumentBlob
  → ExtractionResult
  → NormalizedPayload
  → ExpedienteDigital          ← SoT
  → ValidationReport           (solo lectura expediente)
  → CalculationResult          (job async, solo lectura expediente)
  → Report / AdvisorContext
```

**Prohibido:** `expediente/advisor` → `calculator` (cálculo de fechas/pensión).  
**Permitido:** UI / `recalculate` / chat leen calculator con expediente ya guardado.

---

## Inventario reutilizable actual

| Módulo | Ruta |
|--------|------|
| Tipos + provenance | `lib/expediente/types.ts` |
| Merge | `lib/expediente/merge.ts` |
| Validación | `lib/expediente/cross-validate.ts` → migrar a `lib/validation/` en F1 |
| Pipeline | `lib/ocr/pipeline.ts` |
| Reglas SS | `lib/rules/ss-rules.ts` |
| Pensión | `lib/calculator/pension.ts` |
| Outlook | `lib/calculator/retirement-outlook.ts` |
| Recálculo | `lib/calculator/recalculate.ts` |

---

## Roadmap apps futuras (Fase 5+)

- PlanMiJubilacion — planificación jubilación  
- PlanMisPrestaciones — todas las prestaciones  
- PlanMiVidaLaboral — historial laboral  
- PlanMiFuturo — plataforma integral  

El valor está en el **motor**, no en la skin.
