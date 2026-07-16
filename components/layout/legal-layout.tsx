import Link from 'next/link';
import { Logo } from '@/components/layout/logo';
import { SiteFooter } from '@/components/layout/site-footer';

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Logo size="lg" />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1 max-w-3xl mx-auto px-6 py-12 prose prose-neutral dark:prose-invert w-full">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground not-prose">
          Última actualización: 16 de julio de 2026 · Versión 1.1
        </p>
        {children}
      </main>
      <SiteFooter className="mt-auto" />
    </div>
  );
}
