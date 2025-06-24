/**
 * Site configuration with environment variable support
 */

export interface SiteConfig {
  /** Site name used for branding, SEO, and metadata */
  name: string
  /** Site description for SEO */
  description: string
  /** Site URL base for canonical URLs and social media */
  url: string
}

/**
 * Get the site configuration with environment variable overrides
 */
export function getSiteConfig(): SiteConfig {
  const siteName = process.env.SITE_NAME || ''
  
  return {
    name: siteName,
    description: `Descubra os próximos eventos de corrida em Portugal. Maratonas, meias maratonas, trails e corridas urbanas${siteName ? ` no ${siteName}` : ''}.`,
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://portugal-run-calendar.com'
  }
}

/**
 * Get just the site name (most common use case)
 */
export function getSiteName(): string {
  return getSiteConfig().name
}