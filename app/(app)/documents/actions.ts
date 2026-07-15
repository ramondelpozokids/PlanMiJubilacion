'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getUser } from '@/lib/supabase/server';
import { deleteDocument as deleteFromStorage } from '@/lib/supabase/storage';
import { saveExpediente } from '@/lib/expediente/repository';
import { rebuildExpedienteFromDocuments } from '@/lib/ocr/pipeline';
import { emptyExpediente } from '@/lib/expediente/types';

export async function deleteDocumentById(documentId: string) {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');

  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, storage_path, name')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !doc) throw new Error('Documento no encontrado');

  if (doc.storage_path) {
    try {
      await deleteFromStorage(doc.storage_path);
    } catch {
      // Si el archivo ya no está en storage, seguimos borrando el registro
    }
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('user_id', user.id);

  if (deleteError) throw new Error('No se pudo eliminar el documento');

  await rebuildExpedienteFromDocuments(user.id);

  revalidatePath('/dashboard');
  revalidatePath('/analysis');
  revalidatePath('/upload');

  return { success: true, name: doc.name };
}

export async function deleteAllDocuments() {
  const user = await getUser();
  if (!user) throw new Error('No autenticado');

  const supabase = await createClient();
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, storage_path')
    .eq('user_id', user.id);

  if (error) throw new Error('No se pudieron listar los documentos');

  for (const doc of docs ?? []) {
    if (doc.storage_path) {
      try {
        await deleteFromStorage(doc.storage_path);
      } catch {
        /* ignorar */
      }
    }
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) throw new Error('No se pudieron eliminar los documentos');

  await saveExpediente(emptyExpediente(user.id));
  const supabase2 = await createClient();
  await supabase2.from('scenarios').delete().eq('user_id', user.id);
  await supabase2.from('extracted_data').delete().eq('user_id', user.id);

  revalidatePath('/dashboard');
  revalidatePath('/analysis');
  revalidatePath('/upload');

  return { success: true, count: docs?.length ?? 0 };
}
