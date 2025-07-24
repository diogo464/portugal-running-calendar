import { Metadata } from 'next'
import { HomepageClient } from '@/components/HomepageClient'
import { getUpcomingEventsN } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'
import { getSiteConfig } from '@/lib/site-config'

// Generate metadata for homepage SEO
const siteConfig = getSiteConfig()

export const metadata: Metadata = {
  title: siteConfig.name ? `Eventos de Corrida em Portugal | ${siteConfig.name}` : 'Eventos de Corrida em Portugal',
  description: siteConfig.description,
  keywords: 'corrida, running, maratona, meia maratona, trail, Portugal, eventos, inscrições',
  authors: siteConfig.name ? [{ name: siteConfig.name }] : undefined,
  creator: siteConfig.name || undefined,
  publisher: siteConfig.name || undefined,
  alternates: {
    canonical: getSiteUrl()
  },
  openGraph: {
    title: siteConfig.name ? `Eventos de Corrida em Portugal | ${siteConfig.name}` : 'Eventos de Corrida em Portugal',
    description: 'Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas.',
    url: getSiteUrl(),
    siteName: siteConfig.name || undefined,
    type: 'website',
    locale: 'pt_PT',
    images: [
      {
        url: `${getSiteUrl()}/og-default.png`,
        width: 1200,
        height: 630,
        alt: siteConfig.name ? `${siteConfig.name} - Eventos de Corrida em Portugal` : 'Eventos de Corrida em Portugal'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name ? `Eventos de Corrida em Portugal | ${siteConfig.name}` : 'Eventos de Corrida em Portugal',
    description: 'Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas.',
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
  const initialEvents = await getUpcomingEventsN(12);

  return (
    <>
      {/* JSON-LD Structured Data for homepage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: siteConfig.name || 'Eventos de Corrida em Portugal',
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
            publisher: siteConfig.name ? {
              '@type': 'Organization',
              name: siteConfig.name,
              url: getSiteUrl()
            } : undefined
          })
        }}
      />

      {/* Client-side interactive wrapper with server-rendered initial data */}
      <HomepageClient initialEvents={initialEvents} />
    </>
  )
}
