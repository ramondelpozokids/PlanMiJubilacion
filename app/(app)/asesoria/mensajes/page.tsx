import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getProfile } from '@/lib/supabase/server';
import { hasUnlimitedAccess } from '@/lib/admin/access';
import { listContactSubmissions, markContactRead } from '@/lib/contact/repository';

export const metadata = { title: 'Bandeja de contacto', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ContactInboxPage({
  searchParams,
}: {
  searchParams?: { mark?: string };
}) {
  const profile = await getProfile();
  if (!profile || !hasUnlimitedAccess(profile)) redirect('/dashboard');

  if (searchParams?.mark) {
    await markContactRead(searchParams.mark);
    redirect('/asesoria/mensajes');
  }

  let messages: Awaited<ReturnType<typeof listContactSubmissions>> = [];
  try {
    messages = await listContactSubmissions(80);
  } catch {
    /* tabla aún no creada */
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Fundador</p>
          <h1 className="text-2xl font-semibold tracking-tight">Bandeja de contacto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mensajes del formulario público dirigidos a la bandeja del fundador
            (contacto: info@ramondelpozorott.es). Los adjuntos llegan cifrados
            (AES-256-GCM).
          </p>
        </div>
        <Link href="/asesoria">
          <Button size="sm" variant="secondary">
            Volver a asesoría
          </Button>
        </Link>
      </div>

      {messages.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No hay mensajes todavía. Cuando alguien escriba en{' '}
          <Link href="/contacto" className="underline">
            /contacto
          </Link>
          , aparecerán aquí.
        </p>
      ) : (
        <ul className="space-y-4">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {m.name}{' '}
                    <span className="text-muted-foreground font-normal">· {m.email}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(m.createdAt).toLocaleString('es-ES')}
                    {m.phone ? ` · ${m.phone}` : ''} ·{' '}
                    <span className="uppercase">{m.status}</span>
                  </p>
                </div>
                {m.status === 'new' && (
                  <Link href={`/asesoria/mensajes?mark=${m.id}`}>
                    <Button size="sm" variant="secondary">
                      Marcar leído
                    </Button>
                  </Link>
                )}
              </div>
              <p className="text-sm font-medium">{m.subject}</p>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{m.message}</p>
              {m.attachments.length > 0 && (
                <div className="text-xs rounded-md bg-muted/40 px-3 py-2">
                  <p className="font-medium text-foreground mb-1">
                    Adjuntos cifrados ({m.attachments.length})
                  </p>
                  <ul className="space-y-1 text-muted-foreground">
                    {m.attachments.map((a) => (
                      <li key={a.storagePath} className="flex flex-wrap items-center gap-2">
                        <span>
                          {a.originalName} · {(a.sizeBytes / 1024).toFixed(0)} KB · {a.alg}
                        </span>
                        <a
                          href={`/api/contact/decrypt?id=${m.id}&path=${encodeURIComponent(a.storagePath)}`}
                          className="text-accent underline"
                        >
                          Descargar descifrado
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
