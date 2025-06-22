import { ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface EventRegistrationProps {
  hasRegistrationLink: boolean
  onRegistrationClick: () => void
}

export function EventRegistration({ 
  hasRegistrationLink, 
  onRegistrationClick 
}: EventRegistrationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inscrição</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full"
          variant={hasRegistrationLink ? "default" : "secondary"}
          disabled={!hasRegistrationLink}
          onClick={onRegistrationClick}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {hasRegistrationLink ? "Inscrever-se" : "Não disponível"}
        </Button>
        
        {!hasRegistrationLink && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Página de inscrição não disponível
          </p>
        )}
      </CardContent>
    </Card>
  )
}