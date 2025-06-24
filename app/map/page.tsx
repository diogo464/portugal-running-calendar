import { Metadata } from 'next'
import { MapPageClient } from '@/components/MapPageClient'
import { getUpcomingEvents } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Mapa de Eventos | Portugal Running',
  description: 'Explore eventos de corrida em Portugal através do mapa interativo. Filtre por distrito, distância e período.',
  keywords: 'mapa, corrida, running, eventos, Portugal, distritos',
  authors: [{ name: 'Portugal Running' }],
  creator: 'Portugal Running',
  publisher: 'Portugal Running',
  alternates: {
    canonical: `${getSiteUrl()}/map`
  },
  openGraph: {
    title: 'Mapa de Eventos | Portugal Running',
    description: 'Explore eventos de corrida em Portugal através do mapa interativo.',
    url: `${getSiteUrl()}/map`,
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
  const initialEvents = await getUpcomingEvents() // Load all upcoming events for map view
  
  return <MapPageClient initialEvents={initialEvents} />
}