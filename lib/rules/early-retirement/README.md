# Motor de jubilación anticipada (BOE)

Las tablas oficiales viven en `tables/YYYY/`:

| Archivo | Norma |
|---------|--------|
| `anticipada_voluntaria.json` | LGSS art. 208 |
| `anticipada_involuntaria.json` | LGSS art. 207 |
| `anticipada_voluntaria_sobre_maxima.json` | LGSS DT 34ª (pensión > máxima) |

## Actualizar la legislación

1. Edita o regenera JSON con `python scripts/generate-early-retirement-tables.py`
2. Si añades un año nuevo, registra imports en `table-registry.ts`
3. **No** cambies el motor (`resolve.ts` / `tables.ts`) para alterar porcentajes

## Flujo

Ordinaria → fecha elegida → meses (o fracción) → modalidad → tramo → lookup celda → aplicar %
