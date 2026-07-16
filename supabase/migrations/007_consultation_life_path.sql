-- Escenario vital por consulta de asesoría
alter table public.consultation_cases
  add column if not exists life_path jsonb not null default '{
    "currentlyUnemployed": false,
    "subsidioMayores52From": "2099-01",
    "subsidioCotizacionBase": null,
    "desempleoBaseAntesSubsidio": 0
  }'::jsonb;
