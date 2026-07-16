import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ConsultationClientReport({
  clientName,
  lines,
}: {
  clientName: string;
  lines: string[];
}) {
  return (
    <Card className="print-root border-2 border-accent/30 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-base">Informe para {clientName}</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Resumen en cristiano — imprime o copia para enviar
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </CardContent>
    </Card>
  );
}
