import { Metadata } from 'next'
import { CalendarView } from '@/components/CalendarView'
import { getUpcomingEventsForHomepage } from '@/lib/server-utils'

// Generate metadata for calendar page SEO
export const metadata: Metadata = {
  title: 'Calendário Anual de Eventos | Portugal Running',
  description: 'Visualize todos os eventos de corrida em Portugal no calendário anual. Selecione datas específicas para filtrar eventos de interesse.',
  keywords: 'calendário, eventos, corrida, running, Portugal, datas, maratona, meia maratona, trail',
  authors: [{ name: 'Portugal Running' }],
  creator: 'Portugal Running',
  publisher: 'Portugal Running',
  alternates: {
    canonical: 'https://portugal-running.vercel.app/calendar'
  },
  openGraph: {
    title: 'Calendário Anual de Eventos | Portugal Running',
    description: 'Visualize todos os eventos de corrida em Portugal no calendário anual. Selecione datas específicas para filtrar eventos.',
    url: 'https://portugal-running.vercel.app/calendar',
    siteName: 'Portugal Running',
    type: 'website',
    locale: 'pt_PT',
    images: [
      {
        url: 'https://portugal-running.vercel.app/og-calendar.png',
        width: 1200,
        height: 630,
        alt: 'Portugal Running - Calendário Anual de Eventos'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Calendário Anual de Eventos | Portugal Running',
    description: 'Visualize todos os eventos de corrida em Portugal no calendário anual.',
    creator: '@portugalrunning',
    images: ['https://portugal-running.vercel.app/og-calendar.png']
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
            url: 'https://portugal-running.vercel.app/calendar',
            isPartOf: {
              '@type': 'WebSite',
              name: 'Portugal Running',
              url: 'https://portugal-running.vercel.app'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Portugal Running',
              url: 'https://portugal-running.vercel.app'
            },
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