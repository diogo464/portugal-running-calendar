import { Metadata } from 'next'
import { HomepageClient } from '@/components/HomepageClient'
import { getUpcomingEventsForHomepage } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'

// Generate metadata for homepage SEO
export const metadata: Metadata = {
  title: 'Eventos de Corrida em Portugal | Portugal Running',
  description: 'Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas. Inscreva-se nos melhores eventos de running do país.',
  keywords: 'corrida, running, maratona, meia maratona, trail, Portugal, eventos, inscrições',
  authors: [{ name: 'Portugal Running' }],
  creator: 'Portugal Running',
  publisher: 'Portugal Running',
  alternates: {
    canonical: getSiteUrl()
  },
  openGraph: {
    title: 'Eventos de Corrida em Portugal | Portugal Running',
    description: 'Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas.',
    url: getSiteUrl(),
    siteName: 'Portugal Running',
    type: 'website',
    locale: 'pt_PT',
    images: [
      {
        url: `${getSiteUrl()}/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'Portugal Running - Eventos de Corrida em Portugal'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eventos de Corrida em Portugal | Portugal Running',
    description: 'Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas.',
    creator: '@portugalrunning',
    images: [`${getSiteUrl()}/og-default.png`]
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

export default async function Home() {
  // Get first page of upcoming events for SSR
  const initialEvents = await getUpcomingEventsForHomepage(12)
  
  return (
    <>
      {/* JSON-LD Structured Data for homepage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Portugal Running',
            description: 'Eventos de corrida em Portugal',
            url: getSiteUrl(),
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: `${getSiteUrl()}/?search={search_term_string}`
              },
              'query-input': 'required name=search_term_string'
            },
            publisher: {
              '@type': 'Organization',
              name: 'Portugal Running',
              url: getSiteUrl()
            }
          })
        }}
      />
      
      {/* Client-side interactive wrapper with server-rendered initial data */}
      <HomepageClient initialEvents={initialEvents} />
    </>
  )
}