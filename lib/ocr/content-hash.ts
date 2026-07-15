import { createHash } from 'crypto';

/** Hash estable del binario del documento para idempotencia OCR. */
export function hashDocumentContent(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
