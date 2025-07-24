import { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/utils'

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
