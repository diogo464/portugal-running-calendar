import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable experimental features for better SSR support
  experimental: {
    // Add any stable experimental features here
  },
  
  // Enable image optimization for better performance
  images: {
    domains: [],
    // For local development with static files
    unoptimized: true,
  },
  
  // Configure redirects for better SEO
  async redirects() {
    return [
      // Redirect old event URLs if needed (example)
      // {
      //   source: '/events/:eventId',
      //   destination: '/event/:eventId',
      //   permanent: true,
      // },
    ]
  },
  
  // Configure headers for better caching and security
  async headers() {
    return [
      {
        // Apply cache headers to static assets
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        // Special cache headers for API routes
        source: '/api/event/:eventId',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        // Cache headers for static event files
        source: '/events/:eventId.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        // Cache headers for media files
        source: '/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
  
  // SWC minification is enabled by default in Next.js 15
  
  // Configure output for different deployment scenarios
  output: process.env.NODE_ENV === 'production' ? undefined : 'standalone',
  
  // Enable ESLint during builds
  eslint: {
    dirs: ['app', 'components', 'lib', 'hooks', 'pages'],
  },
  
  // TypeScript configuration
  typescript: {
    // Enable type checking during builds
    ignoreBuildErrors: false,
  },
  
  // Webpack configuration for better optimization
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    
    return config
  },
}

export default nextConfig

// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
initOpenNextCloudflareForDev()
