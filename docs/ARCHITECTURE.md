# Arquitectura PlanMiJubilacion (SIP)

> Documento vivo. Autoridad de producto: [`docs/SIP.md`](./SIP.md) (Fase 0 validada).

## Capas (desacopladas)

```
Upload (storage + pending)
  → Cola async (/api/documents/process)
  → Extractors (lib/extractors) + Document AI opcional
  → OCR OpenAI (texto + visión)
  → Normalización (lib/expediente/normalize)
  → Merge sin sobrescribir (lib/expediente/merge)
  → Validación cruzada (lib/validation)
  → Finalize documental (preguntas + asesor DOCUMENALES)
  → Expediente (expedientes.data) ← única fuente de verdad
  → Job recalculate (lib/calculator/recalculate)  ← SEPARADO
  → Reglas SS + Outlook + escenarios
  → Informes + Chat (leen expediente + escenarios)
```

## Reglas de dependencia

| De → A | ¿OK? |
|--------|------|
| ocr → expediente | ✅ |
| expediente → calculator | ❌ (solo en job recalculate / UI) |
| calculator → expediente (tipos) | ✅ lectura |
| validation → expediente (tipos) | ✅ |
| reports → calculator | ✅ (capa presentación) |

## BD

| Tabla | Rol |
|-------|-----|
| `documents` | Evidencia + OCR crudo |
| `expedientes` | **Fuente de verdad** |
| `scenarios` | Resultado del job `recalculate` |
| `extracted_data` | **DEPRECADO** — no escribir; se elimina en F2 |

## Tests

```bash
npm test
npm run typecheck
```
