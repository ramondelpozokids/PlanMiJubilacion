import { createClient } from './server';

export async function uploadDocument(file: File, userId: string) {
  const supabase = await createClient();
  const ext = file.name.split('.').pop();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;
  return data.path;
}

export async function getSignedUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, 300); // 5 min
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(path: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage.from('documents').remove([path]);
  if (error) throw error;
}

export async function downloadDocument(path: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from('documents').download(path);
  if (error || !data) throw error ?? new Error('No se pudo descargar el documento');

  const ext = path.split('.').pop()?.toLowerCase();
  const mimeType =
    ext === 'pdf'
      ? 'application/pdf'
      : ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  return { buffer: Buffer.from(await data.arrayBuffer()), mimeType };
}