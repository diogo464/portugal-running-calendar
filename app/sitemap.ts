import { MetadataRoute } from 'next'
import { getAllEventUrls } from '@/lib/server-utils'
import { getSiteUrl } from '@/lib/utils'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl()
  
  // Get all event URLs
  const eventUrls = await getAllEventUrls()
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/saved`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
  ]
  
  // Event pages
  const eventPages: MetadataRoute.Sitemap = eventUrls.map(event => ({
    url: `${baseUrl}/event/${event.id}/${event.slug}`,
    lastModified: event.lastModified || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))
  
  return [
    ...staticPages,
    ...eventPages,
  ]
}