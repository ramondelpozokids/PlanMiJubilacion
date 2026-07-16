/**
 * Numeración correlativa FAC-YYYY-NNNNNN / REC-YYYY-NNNNNN
 */
export interface DocumentSequence {
  prefix: 'FAC' | 'REC' | 'INF';
  year: number;
  lastNumber: number;
}

export function formatDocumentNumber(
  prefix: 'FAC' | 'REC' | 'INF',
  year: number,
  seq: number
): string {
  return `${prefix}-${year}-${String(seq).padStart(6, '0')}`;
}

export function nextSequenceNumber(current: number): number {
  return current + 1;
}
