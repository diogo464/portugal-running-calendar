import { Card } from "@/components/ui/card"

export function CalendarLegend() {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap gap-4 justify-center items-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>Alta Atividade (Fim de Semana)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span>Média Atividade (Fim de Semana)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-300 rounded"></div>
          <span>Baixa Atividade (Fim de Semana)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Atividade em Dias de Semana</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Eventos em Feriados</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
          <span>Marcador de Feriado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <span>Dia Selecionado</span>
        </div>
      </div>
    </Card>
  )
}