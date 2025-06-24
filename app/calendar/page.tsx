import { Metadata } from 'next'
import { CalendarView } from '@/components/CalendarView'
import { getUpcomingEventsForHomepage } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'
import { getSiteConfig } from '@/lib/site-config'

// Generate metadata for calendar page SEO
const siteConfig = getSiteConfig()

export const metadata: Metadata = {
  title: siteConfig.name ? `Calendário Anual de Eventos | ${siteConfig.name}` : 'Calendário Anual de Eventos',
  description: 'Visualize todos os eventos de corrida em Portugal no calendário anual. Selecione datas específicas para filtrar eventos de interesse.',
  keywords: 'calendário, eventos, corrida, running, Portugal, datas, maratona, meia maratona, trail',
  authors: siteConfig.name ? [{ name: siteConfig.name }] : undefined,
  creator: siteConfig.name || undefined,
  publisher: siteConfig.name || undefined,
  alternates: {
    canonical: `${getSiteUrl()}/calendar`
  },
  openGraph: {
    title: siteConfig.name ? `Calendário Anual de Eventos | ${siteConfig.name}` : 'Calendário Anual de Eventos',
    description: 'Visualize todos os eventos de corrida em Portugal no calendário anual. Selecione datas específicas para filtrar eventos.',
    url: `${getSiteUrl()}/calendar`,
    siteName: siteConfig.name || undefined,
    type: 'website',
    locale: 'pt_PT',
    images: [
      {
        url: `${getSiteUrl()}/og-calendar.png`,
        width: 1200,
        height: 630,
        alt: siteConfig.name ? `${siteConfig.name} - Calendário Anual de Eventos` : 'Calendário Anual de Eventos'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name ? `Calendário Anual de Eventos | ${siteConfig.name}` : 'Calendário Anual de Eventos',
    description: 'Visualize todos os eventos de corrida em Portugal no calendário anual.',
    images: [`${getSiteUrl()}/og-calendar.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function CalendarPage() {
  // Get all events for calendar view
  const initialEvents = await getUpcomingEventsForHomepage(1000) // Get more events for calendar
  
  return (
    <>
      {/* JSON-LD Structured Data for calendar page */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Calendário Anual de Eventos de Corrida',
            description: 'Calendário visual com todos os eventos de corrida em Portugal',
            url: `${getSiteUrl()}/calendar`,
            isPartOf: {
              '@type': 'WebSite',
              name: siteConfig.name || 'Eventos de Corrida em Portugal',
              url: getSiteUrl()
            },
            publisher: siteConfig.name ? {
              '@type': 'Organization',
              name: siteConfig.name,
              url: getSiteUrl()
            } : undefined,
            mainEntity: {
              '@type': 'Event',
              name: 'Eventos de Corrida em Portugal',
              description: 'Calendário visual com eventos de running, maratonas e trails'
            }
          })
        }}
      />
      
      {/* Calendar view with server-rendered initial data */}
      <CalendarView initialEvents={initialEvents} />
    </>
  )
}