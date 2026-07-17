export const PLANMI_BRAND = 'Ecosistema PlanMi';

export type PlanMiProductId =
  | 'jubilacion'
  | 'prestaciones'
  | 'vida-laboral'
  | 'futuro';

export type PlanMiProductStatus = 'activo' | 'expansion';

export interface PlanMiProduct {
  id: PlanMiProductId;
  name: string;
  shortLabel: string;
  tagline: string;
  href: string;
  status: PlanMiProductStatus;
  accent: string;
}

export const PLANMI_PRODUCTS: PlanMiProduct[] = [
  {
    id: 'jubilacion',
    name: 'PlanMiJubilacion',
    shortLabel: 'Jubilación',
    tagline: 'Planificación de la jubilación',
    href: '/jubilacion',
    status: 'activo',
    accent: 'from-foreground/10 to-transparent',
  },
  {
    id: 'prestaciones',
    name: 'PlanMisPrestaciones',
    shortLabel: 'Prestaciones',
    tagline: 'Todas las prestaciones de la Seguridad Social',
    href: '/prestaciones',
    status: 'activo',
    accent: 'from-success/15 to-transparent',
  },
  {
    id: 'vida-laboral',
    name: 'PlanMiVidaLaboral',
    shortLabel: 'Vida laboral',
    tagline: 'Gestión y análisis del historial laboral',
    href: '/vida-laboral',
    status: 'activo',
    accent: 'from-warning/15 to-transparent',
  },
  {
    id: 'futuro',
    name: 'PlanMiFuturo',
    shortLabel: 'Futuro',
    tagline: 'Plataforma integral de planificación social y financiera',
    href: '/futuro',
    status: 'activo',
    accent: 'from-accent/20 to-transparent',
  },
];

export function getPlanMiProduct(id: PlanMiProductId): PlanMiProduct {
  const p = PLANMI_PRODUCTS.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown PlanMi product: ${id}`);
  return p;
}
