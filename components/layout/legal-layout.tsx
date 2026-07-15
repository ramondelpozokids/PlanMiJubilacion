import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Volver al inicio
          </Link>
        </div>
      </header>
      <main id="main" className="max-w-3xl mx-auto px-6 py-12 prose prose-neutral dark:prose-invert">
        <h1>{title}</h1>
        <p className="text-sm text-muted-foreground not-prose">
          Última actualización: 1 de enero de 2025 · Versión 1.0
        </p>
        {children}
      </main>
    </div>
  );
}
