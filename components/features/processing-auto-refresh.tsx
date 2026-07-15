'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Refresca la página mientras haya documentos en cola o procesándose. */
export function ProcessingAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [active, router]);

  if (!active) return null;

  return (
    <p className="text-sm text-muted-foreground animate-pulse">
      Análisis en curso — la página se actualizará automáticamente…
    </p>
  );
}
