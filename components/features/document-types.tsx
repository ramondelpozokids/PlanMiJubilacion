import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DOCUMENT_TYPES = [
  {
    id: 'vida_laboral',
    title: 'Vida laboral',
    description: 'Informe de la Seguridad Social con tu historial de cotización.',
    required: true,
  },
  {
    id: 'bases',
    title: 'Bases de cotización',
    description: 'Últimos 24 meses para calcular la base reguladora.',
    required: false,
  },
  {
    id: 'nomina',
    title: 'Nómina reciente',
    description: 'Complementa datos si tu vida laboral está desactualizada.',
    required: false,
  },
  {
    id: 'resolucion',
    title: 'Resolución / certificado',
    description: 'Documentos oficiales sobre situación o reconocimiento.',
    required: false,
  },
];

export function DocumentTypes() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos recomendados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {DOCUMENT_TYPES.map((doc) => (
          <div key={doc.id} className="flex gap-3">
            <div
              className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                doc.required ? 'bg-accent' : 'bg-muted-foreground/40'
              }`}
            />
            <div>
              <div className="text-sm font-medium">
                {doc.title}
                {doc.required && (
                  <span className="ml-2 text-xs text-accent font-normal">Imprescindible</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
