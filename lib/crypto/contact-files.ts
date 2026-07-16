/**
 * Cifrado de adjuntos de contacto (AES-256-GCM) en el navegador.
 * El fichero en claro no sale del dispositivo; solo se sube el ciphertext.
 */

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type EncryptedAttachmentPayload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /** Ciphertext AES-GCM (incluye tag) en base64 */
  ciphertextB64: string;
  /** IV 12 bytes en base64 */
  ivB64: string;
  /** Clave AES raw en base64 (se reenvuelve en servidor con CONTACT_FILE_SECRET) */
  fileKeyB64: string;
};

export async function encryptFileForContact(file: File): Promise<EncryptedAttachmentPayload> {
  if (file.size > 12 * 1024 * 1024) {
    throw new Error(`«${file.name}» supera 12 MB`);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = await file.arrayBuffer();
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const rawKey = await crypto.subtle.exportKey('raw', key);

  return {
    originalName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    ciphertextB64: bufToB64(cipher),
    ivB64: bufToB64(iv),
    fileKeyB64: bufToB64(rawKey),
  };
}

/** Solo servidor: deriva clave maestra y envuelve la clave del fichero. */
export async function wrapFileKey(fileKeyB64: string, secret: string): Promise<{
  wrappedKeyB64: string;
  wrapIvB64: string;
}> {
  const master = await deriveMasterKey(secret);
  const wrapIv = crypto.getRandomValues(new Uint8Array(12));
  const fileKey = b64ToBytes(fileKeyB64);
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapIv },
    master,
    fileKey
  );
  return { wrappedKeyB64: bufToB64(wrapped), wrapIvB64: bufToB64(wrapIv) };
}

export async function unwrapFileKey(
  wrappedKeyB64: string,
  wrapIvB64: string,
  secret: string
): Promise<CryptoKey> {
  const master = await deriveMasterKey(secret);
  const raw = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(wrapIvB64) },
    master,
    b64ToBytes(wrappedKeyB64)
  );
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
}

export async function decryptAttachment(
  ciphertextB64: string,
  ivB64: string,
  fileKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(ivB64) },
    fileKey,
    b64ToBytes(ciphertextB64)
  );
}

async function deriveMasterKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.digest('SHA-256', enc.encode(`planmi-contact-v1:${secret}`));
  return crypto.subtle.importKey('raw', base, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export { bufToB64, b64ToBytes, b64ToBytes as b64ToBuf };
