import { useState, useEffect } from 'react'

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkBreakpoint = () => {
      // Using Tailwind's md breakpoint (768px)
      setIsMobile(window.innerWidth < 768)
    }

    // Check on initial load
    checkBreakpoint()

    // Add event listener for window resize
    window.addEventListener('resize', checkBreakpoint)

    // Cleanup
    return () => window.removeEventListener('resize', checkBreakpoint)
  }, [])

  return { isMobile }
}