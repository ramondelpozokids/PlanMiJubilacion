import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dropzone } from '@/components/features/dropzone';
import { DocumentTypes } from '@/components/features/document-types';
import { DocumentList } from '@/components/features/document-list';
import { OpenAiConfigBanner } from '@/components/features/openai-config-banner';
import { getUser, createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

export const metadata = {
  title: 'Subir documentos',
  robots: { index: false },
};

/** Lectura completa del PDF puede tardar 1-3 min */
export const maxDuration = 300;

type Document = Pick<
  Database['public']['Tables']['documents']['Row'],
  'id' | 'name' | 'document_type' | 'ocr_status' | 'created_at' | 'ocr_error'
>;

export default async function UploadPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const supabase = await createClient();
  const { data: documentsData } = await supabase
    .from('documents')
    .select('id, name, document_type, ocr_status, created_at, ocr_error')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const documents = (documentsData ?? []) as Document[];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Sube tus documentos</h1>
        <p className="text-muted-foreground mt-2">
          Cada cierto tiempo vuelve a subir tu <strong>vida laboral</strong> y tus{' '}
          <strong>bases de cotización</strong>. PlanMiJubilacion actualiza el expediente hasta
          hoy — sin inventar el futuro.
        </p>
      </header>

      <OpenAiConfigBanner />

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm space-y-1">
        <p className="font-medium">Flujo recomendado para estar al día</p>
        <ol className="list-decimal pl-5 text-muted-foreground space-y-1">
          <li>Descarga el PDF nuevo en la sede de la Seguridad Social.</li>
          <li>
            Súbelo aquí (tipo correcto: Vida laboral o Bases de cotización).
          </li>
          <li>
            El expediente se enriquece: nuevos meses/periodos entran; lo futuro o “presente”
            proyectado se descarta.
          </li>
        </ol>
      </div>
      <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm">
        <svg className="w-5 h-5 text-warning flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>
          Tus documentos se procesan con cifrado de extremo a extremo. Nunca compartimos tus datos.
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Dropzone />
        <DocumentTypes />
      </div>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tus documentos ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentList documents={documents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}