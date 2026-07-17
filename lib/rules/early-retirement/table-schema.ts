import type { CareerBracketId } from './types';

export interface OfficialCoefficientTableFile {
  year: number;
  modality: string;
  legalBasis: string;
  boeRef: string;
  unit: string;
  note?: string;
  maxMonths: number;
  brackets: CareerBracketId[];
  byMonthsEarly: Record<string, Record<CareerBracketId, number>>;
}
