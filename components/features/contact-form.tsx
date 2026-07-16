'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { encryptFileForContact, type EncryptedAttachmentPayload } from '@/lib/crypto/contact-files';
import { submitContactAction } from '@/app/contacto/actions';
import { toast } from 'sonner';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';

export function ContactForm() {
  const [pending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [done, setDone] = useState(false);
  const [encrypting, setEncrypting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    setEncrypting(true);
    let encrypted: EncryptedAttachmentPayload[] = [];
    try {
      encrypted = await Promise.all(files.map((f) => encryptFileForContact(f)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cifrar archivos');
      setEncrypting(false);
      return;
    }
    setEncrypting(false);

    fd.set('attachmentsJson', JSON.stringify(encrypted));
    fd.set('consent', form.querySelector<HTMLInputElement>('#consent')?.checked ? 'true' : 'false');

    startTransition(async () => {
      const res = await submitContactAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setDone(true);
      setFiles([]);
      form.reset();
      toast.success('Mensaje enviado de forma segura');
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center space-y-3">
        <h2 className="text-xl font-semibold">Mensaje recibido</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Gracias. Ramón revisará tu consulta. Si adjuntaste documentos, viajaron cifrados
          (AES-256-GCM) desde tu navegador.
        </p>
        <Button type="button" variant="secondary" onClick={() => setDone(false)}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border p-6 md:p-8">
      {/* Honeypot anti-bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Nombre *</span>
          <input
            name="name"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            placeholder="Tu nombre"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Email *</span>
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            placeholder="tu@email.com"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Teléfono</span>
          <input
            name="phone"
            type="tel"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            placeholder="Opcional"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Asunto *</span>
          <input
            name="subject"
            required
            minLength={3}
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            placeholder="Consulta sobre jubilación…"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-muted-foreground">Mensaje *</span>
        <textarea
          name="message"
          required
          minLength={10}
          rows={6}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          placeholder="Cuéntanos tu situación. No hace falta datos sensibles en el texto si prefieres adjuntarlos cifrados."
        />
      </label>

      <div className="rounded-lg border border-dashed bg-muted/20 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Documentos cifrados (opcional)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Se cifran en tu navegador con AES-256-GCM antes de enviarse. Máx. 5 archivos, 12 MB c/u
            (PDF, imágenes, Word).
          </p>
        </div>
        <input
          type="file"
          accept={ACCEPT}
          multiple
          disabled={pending || encrypting}
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []).slice(0, 5);
            setFiles(list);
          }}
          className="block w-full text-sm"
        />
        {files.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-1">
            {files.map((f) => (
              <li key={f.name + f.size}>
                {f.name} · {(f.size / 1024).toFixed(0)} KB → se cifrará al enviar
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input id="consent" name="consent" type="checkbox" required className="mt-1 rounded" />
        <span className="text-muted-foreground">
          He leído y acepto la{' '}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            política de privacidad
          </Link>{' '}
          y el tratamiento de mis datos para responder a esta consulta. *
        </span>
      </label>

      <Button type="submit" size="lg" disabled={pending || encrypting} className="w-full sm:w-auto">
        {encrypting ? 'Cifrando documentos…' : pending ? 'Enviando…' : 'Enviar de forma segura'}
      </Button>
    </form>
  );
}
