'use client'

import { ReactNode } from 'react'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

interface PageLayoutProps {
  children: ReactNode
  savedEventIds: Set<number>
  className?: string
  variant?: 'default' | 'fullscreen'
}

export function PageLayout({ 
  children, 
  savedEventIds, 
  className = '',
  variant = 'default'
}: PageLayoutProps) {
  if (variant === 'fullscreen') {
    // For pages like Map that need full screen layout
    return (
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-background">
          <div className="container mx-auto px-4 py-6">
            <Header savedEventIds={savedEventIds} />
          </div>
        </div>
        
        {/* Content */}
        <div className={`flex-1 ${className}`}>
          {children}
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    )
  }

  // Default layout for most pages
  return (
    <div className={`container mx-auto px-4 py-6 ${className}`}>
      <Header savedEventIds={savedEventIds} />
      {children}
      <Footer />
    </div>
  )
}