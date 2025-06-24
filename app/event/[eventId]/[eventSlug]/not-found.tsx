import Link from 'next/link'
import { ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EventNotFound() {
  return (
    <div className="container mx-auto px-4 py-20">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-4">Evento não encontrado</h2>
          <p className="text-muted-foreground mb-8">
            O evento solicitado não existe ou foi removido. Pode ter sido cancelado ou os detalhes podem ter mudado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="default">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Página Principal
              </Link>
            </Button>
            
            <Button asChild variant="outline">
              <Link href="javascript:history.back()" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
          
          <div className="mt-8 text-sm text-muted-foreground">
            <p>Sugestões:</p>
            <ul className="mt-2 space-y-1">
              <li>• Verifique o endereço da página</li>
              <li>• Explore outros eventos na página principal</li>
              <li>• Use os filtros para encontrar eventos similares</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}