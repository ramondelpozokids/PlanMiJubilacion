import { revalidatePath } from 'next/cache';

const PRODUCT_PATHS = [
  '/dashboard',
  '/analysis',
  '/upload',
  '/vida-laboral',
  '/jubilacion',
  '/prestaciones',
  '/asesoria',
  '/asesoria/consultas',
  '/comparator',
  '/futuro',
  '/miop',
  '/informes',
] as const;

/** Revalida todas las páginas de producto tras OCR / merge de expediente. */
export function revalidateProductPaths(caseId?: string | null) {
  for (const path of PRODUCT_PATHS) {
    revalidatePath(path);
  }
  if (caseId) {
    revalidatePath(`/asesoria/${caseId}`);
  }
}
