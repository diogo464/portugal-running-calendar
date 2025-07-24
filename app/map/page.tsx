import { Metadata } from 'next'
import { MapPageClient } from '@/components/MapPageClient'
import { getUpcomingEvents, getAllDistricts } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'
import { getSiteConfig } from '@/lib/site-config'

const siteConfig = getSiteConfig()

export const metadata: Metadata = {
  title: siteConfig.name ? `Mapa de Eventos | ${siteConfig.name}` : 'Mapa de Eventos',
  description: 'Explore eventos de corrida em Portugal através do mapa interativo. Filtre por distrito, distância e período.',
  keywords: 'mapa, corrida, running, eventos, Portugal, distritos',
  authors: siteConfig.name ? [{ name: siteConfig.name }] : undefined,
  creator: siteConfig.name || undefined,
  publisher: siteConfig.name || undefined,
  alternates: {
    canonical: `${getSiteUrl()}/map`
  },
  openGraph: {
    title: siteConfig.name ? `Mapa de Eventos | ${siteConfig.name}` : 'Mapa de Eventos',
    description: 'Explore eventos de corrida em Portugal através do mapa interativo.',
    url: `${getSiteUrl()}/map`,
    siteName: siteConfig.name || undefined,
    type: 'website',
    locale: 'pt_PT',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default async function MapPage() {
  const [initialEvents, districts] = await Promise.all([
    getUpcomingEvents(), // Load all upcoming events for map view
    getAllDistricts() // Load districts data server-side
  ])
  
  return <MapPageClient initialEvents={initialEvents} districts={districts} />
}