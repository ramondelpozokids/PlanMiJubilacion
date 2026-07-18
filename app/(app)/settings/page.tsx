import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProfile } from '@/lib/supabase/server';
import { getAccessLabel, hasUnlimitedAccess } from '@/lib/admin/access';
import { ADMINS } from '@/lib/admin/config';
import { SECURITY_LAYERS } from '@/lib/security/layers';

export const metadata = { title: 'Ajustes', robots: { index: false } };

export default async function SettingsPage() {
  const profile = await getProfile();
  const isFounder = hasUnlimitedAccess(profile);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-muted-foreground mt-2">Tu cuenta y preferencias.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <strong>Nombre:</strong> {profile?.full_name ?? '—'}
          </p>
          <p>
            <strong>Email:</strong> {profile?.email ?? '—'}
          </p>
          <p>
            <strong>Plan:</strong> {getAccessLabel(profile)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Privacidad · 3 capas de seguridad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            El expediente (DNI, bases, vida laboral) está protegido en capas independientes. Si
            una falla, las otras siguen acotando el acceso.
          </p>
          {SECURITY_LAYERS.map((layer) => (
            <div key={layer.id} className="rounded-lg border p-4 space-y-2">
              <p className="text-sm font-semibold">{layer.title}</p>
              <p className="text-sm text-muted-foreground">{layer.summary}</p>
              <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                {layer.checks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {isFounder && (
        <Card className="border-accent/30">
          <CardHeader>
            <CardTitle>Acceso fundador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Cuentas con acceso ilimitado, gratuito y sin restricciones:</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              {ADMINS.map((admin) => (
                <li key={admin.email}>{admin.email}</li>
              ))}
            </ul>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1 mt-3">
              <li>Chat IA sin límites</li>
              <li>OCR y subida de documentos ilimitada</li>
              <li>Todos los escenarios y comparadores</li>
              <li>Premium incluido de por vida</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
