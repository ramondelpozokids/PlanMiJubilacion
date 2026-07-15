import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Logo } from '@/components/layout/logo';
import { signInWithGoogle, signInWithApple, signInWithEmail } from './actions';

export const metadata = {
  title: 'Iniciar sesión',
  robots: { index: false, follow: false },
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const configError = searchParams?.error === 'supabase_not_configured';

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-[420px] p-10">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        {configError && (
          <div className="mb-6 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            <strong>Supabase no configurado.</strong> Edita{' '}
            <code className="text-xs">.env.local</code> con tu URL y anon key desde{' '}
            <a
              href="https://supabase.com/dashboard/project/_/settings/api"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase → Settings → API
            </a>
            , luego reinicia <code className="text-xs">npm run dev</code>.
          </div>
        )}
        <CardHeader className="p-0 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-muted-foreground mt-2">
            Accede para continuar con tu planificación.
          </p>
        </CardHeader>

        <div className="mt-8 space-y-3">
          <form action={signInWithGoogle}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              <GoogleIcon />
              Continuar con Google
            </Button>
          </form>
          <form action={signInWithApple}>
            <Button type="submit" variant="ghost" className="w-full justify-start">
              <AppleIcon />
              Continuar con Apple
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-4 my-6 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" />
          <span>o</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form action={signInWithEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full h-10 px-3 rounded-md border bg-background text-sm focus-ring"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full h-10 px-3 rounded-md border bg-background text-sm focus-ring"
            />
          </div>
          <Button type="submit" className="w-full">
            Iniciar sesión
          </Button>
        </form>

        <p className="text-center text-sm mt-6 text-muted-foreground">
          ¿Primera vez? Usa Google, Apple o crea cuenta con tu email arriba.
        </p>
        <p className="text-center text-xs mt-4 text-muted-foreground">
          Al continuar aceptas nuestros{' '}
          <a href="/legal/terms" className="underline">términos</a> y{' '}
          <a href="/legal/privacy" className="underline">política de privacidad</a>.
        </p>
      </Card>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.3-7.2 2.3-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.5 44 30.1 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
    </svg>
  );
}