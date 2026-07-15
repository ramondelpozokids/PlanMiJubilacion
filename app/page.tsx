import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/layout/logo';
import { getUser } from '@/lib/supabase/server';

export default async function HomePage() {
  const user = await getUser();

  return (
    <main className="min-h-screen">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex gap-3">
            {user ? (
              <Link href="/dashboard"><Button>Ir al dashboard</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
                <Link href="/login"><Button>Empezar gratis</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight max-w-3xl mx-auto">
          Planifica tu jubilación con IA
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl mx-auto">
          Sube tu vida laboral y descubre cuánto cobrarás, cuándo jubilarte y cómo maximizar tu pensión.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href={user ? '/upload' : '/login'}><Button size="lg">Subir documentos</Button></Link>
          <Link href="/login"><Button size="lg" variant="secondary">Ver demo</Button></Link>
        </div>
        <p className="text-xs text-muted-foreground mt-8 max-w-xl mx-auto">
          Simulaciones orientativas. No sustituyen el cálculo oficial de la Seguridad Social.
        </p>
      </section>
    </main>
  );
}
