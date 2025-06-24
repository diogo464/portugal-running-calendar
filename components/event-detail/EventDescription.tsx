import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface EventDescriptionProps {
  descriptionShort?: string | null
  description?: string | null
}

export function EventDescription({ 
  descriptionShort, 
  description 
}: EventDescriptionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Descrição</CardTitle>
      </CardHeader>
      <CardContent>
        {descriptionShort && (
          <p className="text-lg font-medium text-muted-foreground mb-4">
            {descriptionShort}
          </p>
        )}
        
        {description ? (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <p className="text-muted-foreground italic">
            Descrição não disponível
          </p>
        )}
      </CardContent>
    </Card>
  )
}