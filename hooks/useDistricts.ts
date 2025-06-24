import { useState, useEffect } from 'react'
import { District, validateDistrictsFile } from '@/lib/district-types'

interface UseDistrictsReturn {
  districts: District[]
  loading: boolean
  error: string | null
}

export function useDistricts(): UseDistrictsReturn {
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/districts.json')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const rawData = await response.json()
        const districtsData = validateDistrictsFile(rawData)
        
        // Convert the object to an array of districts
        const districtsArray = Object.values(districtsData)
        setDistricts(districtsArray)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load districts'
        setError(errorMessage)
        console.error('Failed to load districts:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDistricts()
  }, [])

  return { districts, loading, error }
}