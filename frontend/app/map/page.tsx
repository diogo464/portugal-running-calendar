import { Metadata } from 'next'
import { MapPageClient } from '@/components/MapPageClient'
import { getEventsForHomepage } from '@/lib/server-utils'

export const metadata: Metadata = {
  title: 'Mapa de Eventos | Portugal Running',
  description: 'Explore eventos de corrida em Portugal através do mapa interativo. Filtre por distrito, distância e período.',
  keywords: 'mapa, corrida, running, eventos, Portugal, distritos',
  authors: [{ name: 'Portugal Running' }],
  creator: 'Portugal Running',
  publisher: 'Portugal Running',
  alternates: {
    canonical: 'https://portugal-running.vercel.app/map'
  },
  openGraph: {
    title: 'Mapa de Eventos | Portugal Running',
    description: 'Explore eventos de corrida em Portugal através do mapa interativo.',
    url: 'https://portugal-running.vercel.app/map',
    siteName: 'Portugal Running',
    type: 'website',
    locale: 'pt_PT',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function MapPage() {
  const initialEvents = await getEventsForHomepage(500) // Load more events for map view
  
  return <MapPageClient initialEvents={initialEvents} />
}