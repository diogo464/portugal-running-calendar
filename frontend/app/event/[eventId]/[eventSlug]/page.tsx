import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { EventDetailClient } from '@/components/EventDetailClient'
import { getEventById, generateEventTitle, generateEventDescription, createSlugFromName } from '@/lib/server-utils'
import { Event } from '@/lib/types'

interface EventDetailProps {
  params: Promise<{
    eventId: string
    eventSlug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata(
  { params }: EventDetailProps
): Promise<Metadata> {
  const resolvedParams = await params
  const eventId = parseInt(resolvedParams.eventId, 10)
  
  if (isNaN(eventId)) {
    return {
      title: 'Evento não encontrado | Portugal Running',
      description: 'O evento solicitado não foi encontrado.'
    }
  }

  const event = await getEventById(eventId)
  
  if (!event) {
    return {
      title: 'Evento não encontrado | Portugal Running',
      description: 'O evento solicitado não foi encontrado.'
    }
  }

  const title = generateEventTitle(event)
  const description = generateEventDescription(event)
  const location = event.locality || event.location || 'Portugal'
  
  // Create canonical URL
  const slug = event.slug || createSlugFromName(event.name)
  const canonicalUrl = `https://portugal-running.vercel.app/event/${event.id}/${slug}`
  
  return {
    title,
    description,
    keywords: [
      'corrida',
      'running',
      'Portugal',
      event.name,
      location,
      ...event.types
    ].join(', '),
    authors: [{ name: 'Portugal Running' }],
    creator: 'Portugal Running',
    publisher: 'Portugal Running',
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'Portugal Running',
      type: 'article',
      locale: 'pt_PT',
      images: event.images.length > 0 ? [
        {
          url: `https://portugal-running.vercel.app/${event.images[0]}`,
          width: 1200,
          height: 630,
          alt: event.name
        }
      ] : [
        {
          url: 'https://portugal-running.vercel.app/og-default.png',
          width: 1200,
          height: 630,
          alt: 'Portugal Running'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@portugalrunning',
      images: event.images.length > 0 ? [
        `https://portugal-running.vercel.app/${event.images[0]}`
      ] : [
        'https://portugal-running.vercel.app/og-default.png'
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
  const eventId = parseInt(resolvedParams.eventId, 10)
  
  if (isNaN(eventId)) {
    notFound()
  }

  const event = await getEventById(eventId)
  
  if (!event) {
    notFound()
  }

  // Validate that the slug matches (redirect if needed)
  const expectedSlug = event.slug || createSlugFromName(event.name)
  if (resolvedParams.eventSlug !== expectedSlug) {
    // In a production app, you might want to redirect here
    // For now, we'll just continue rendering
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
  const eventUrl = `https://portugal-running.vercel.app/event/${event.id}/${event.slug || createSlugFromName(event.name)}`
  
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: event.name,
    description: event.description_short || `Evento de corrida em ${location}`,
    url: eventUrl,
    startDate: event.start_date,
    endDate: event.end_date,
    location: event.coordinates ? {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.locality,
        addressRegion: event.administrative_area_level_1,
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
        addressRegion: event.administrative_area_level_1,
        addressCountry: event.country || 'Portugal'
      }
    },
    organizer: {
      '@type': 'Organization',
      name: 'Portugal Running',
      url: 'https://portugal-running.vercel.app'
    },
    sport: 'Running',
    eventStatus: 'https://schema.org/EventScheduled',
    offers: event.page ? {
      '@type': 'Offer',
      url: event.page,
      availability: 'https://schema.org/InStock'
    } : undefined,
    image: event.images.length > 0 ? 
      event.images.map(img => `https://portugal-running.vercel.app/${img}`) : 
      ['https://portugal-running.vercel.app/og-default.png']
  }
}