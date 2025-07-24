import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Environment variables with defaults
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'development' 
        ? 'http://localhost:5173' 
        : 'https://portugalruncalendar.com'),
    SITE_NAME: process.env.SITE_NAME || 'Portugal Run Calendar',
  },
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
        // Apply security headers and CSP to all pages
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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://www.google-analytics.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com https://www.google-analytics.com wss: https:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "manifest-src 'self'",
              "worker-src 'self'",
            ].join('; '),
          },
        ],
      },
      {
        // Cache headers for static event files
        source: '/event/:eventId/:eventSlug',
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
  
  // Configure output for standalone Node.js deployment
  output: 'export',
  
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
