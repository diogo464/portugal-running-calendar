export const revalidate = 3600;
export const dynamicParams = false;

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { EventDetailClient } from '@/components/EventDetailClient'
import { getEventBySlug, generateEventTitle, generateEventDescription, getAllEvents } from '@/lib/server-utils'
import { Event } from '@/lib/types'
import { getSiteUrl } from '@/lib/utils'
import { getSiteConfig } from '@/lib/site-config'

interface EventDetailProps {
  params: Promise<{
    slug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: EventDetailProps
): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const siteConfig = getSiteConfig()

  const event = await getEventBySlug(slug)

  if (!event) {
    return {
      title: siteConfig.name ? `Evento não encontrado | ${siteConfig.name}` : 'Evento não encontrado',
      description: 'O evento solicitado não foi encontrado.'
    }
  }

  const title = generateEventTitle(event)
  const description = generateEventDescription(event)
  const location = event.locality || event.location || 'Portugal'

  // Create canonical URL with slug
  const canonicalUrl = `${getSiteUrl()}/event/${event.slug}`

  return {
    title,
    description,
    keywords: [
      'corrida',
      'running',
      'Portugal',
      event.name,
      location,
      ...event.categories
    ].join(', '),
    authors: siteConfig.name ? [{ name: siteConfig.name }] : undefined,
    creator: siteConfig.name || undefined,
    publisher: siteConfig.name || undefined,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: siteConfig.name || undefined,
      type: 'article',
      locale: 'pt_PT',
      images: event.images.length > 0 ? [
        {
          url: `${getSiteUrl()}${event.images[0]}`,
          width: 1200,
          height: 630,
          alt: event.name
        }
      ] : [
        {
          url: `${getSiteUrl()}/og-default.png`,
          width: 1200,
          height: 630,
          alt: siteConfig.name || 'Eventos de Corrida em Portugal'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: event.images.length > 0 ? [
        `${getSiteUrl()}${event.images[0]}`
      ] : [
        `${getSiteUrl()}/og-default.png`
      ]
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
}

export default async function EventDetail({ params }: EventDetailProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug

  const event = await getEventBySlug(slug)

  if (!event) {
    notFound()
  }

  return (
    <>
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateEventStructuredData(event))
        }}
      />

      {/* Client-side interactive wrapper */}
      <EventDetailClient event={event} />
    </>
  )
}

// Generate structured data for rich snippets
function generateEventStructuredData(event: Event) {
  const location = event.locality || event.location || 'Portugal'
  const eventUrl = `${getSiteUrl()}/event/${event.slug}`
  const siteConfig = getSiteConfig()

  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description_short || `Evento de corrida em ${location}`,
    url: eventUrl,
    startDate: event.date,
    endDate: event.date,
    location: event.coordinates ? {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.locality,
        addressRegion: event.locality,
        addressCountry: event.country || 'Portugal'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.coordinates.lat,
        longitude: event.coordinates.lon
      }
    } : {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.locality,
        addressRegion: event.locality,
        addressCountry: event.country || 'Portugal'
      }
    },
    organizer: siteConfig.name ? {
      '@type': 'Organization',
      name: siteConfig.name,
      url: getSiteUrl()
    } : undefined,
    sport: 'Running',
    eventStatus: 'https://schema.org/EventScheduled',
    offers: event.page ? {
      '@type': 'Offer',
      url: event.page,
      availability: 'https://schema.org/InStock'
    } : undefined,
    image: event.images.length > 0 ?
      event.images.map(img => `${getSiteUrl()}${img}`) :
      [`${getSiteUrl()}/og-default.png`]
  }
}

export async function generateStaticParams() {
  const events = await getAllEvents();
  return events.map(e => ({
    slug: e.slug,
  }));
}