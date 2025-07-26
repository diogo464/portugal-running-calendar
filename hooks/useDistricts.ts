import { District, validateDistrictsFile } from '@/lib/district-types'
import { useDataFetcher, createDataCache } from './useDataFetcher'

// Module-level cache for districts
const districtsCache = createDataCache<District[]>()

interface UseDistrictsReturn {
  districts: District[]
  loading: boolean
  error: string | null
}

export function useDistricts(): UseDistrictsReturn {
  const { data, loading, error } = useDataFetcher(
    '/districts.json',
    (rawData) => {
      const districtsData = validateDistrictsFile(rawData)
      // Convert the object to an array of districts
      return Object.values(districtsData)
    },
    districtsCache
  )

  return { 
    districts: data || [], 
    loading, 
    error 
  }
}