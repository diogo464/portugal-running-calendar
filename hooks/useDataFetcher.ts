import { useState, useEffect } from 'react'

// Cache factory to create isolated cache instances for different data types
function createDataCache<T>() {
  let cache: T | null = null
  let promise: Promise<T> | null = null
  
  return {
    getCache: () => cache,
    getPromise: () => promise,
    setCache: (data: T) => { cache = data },
    setPromise: (p: Promise<T>) => { promise = p },
    clearCache: () => { 
      cache = null
      promise = null 
    }
  }
}

// Generic data fetcher hook with caching
export function useDataFetcher<T>(
  url: string,
  validator: (data: unknown) => T,
  cacheManager: ReturnType<typeof createDataCache<T>>
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Return cached data if available
        const cachedData = cacheManager.getCache()
        if (cachedData) {
          setData(cachedData)
          setLoading(false)
          return
        }
        
        // Return ongoing promise if fetch is already in progress
        const ongoingPromise = cacheManager.getPromise()
        if (ongoingPromise) {
          const result = await ongoingPromise
          setData(result)
          setLoading(false)
          return
        }
        
        // Create new fetch promise
        const fetchPromise = (async () => {
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.statusText}`)
          }
          
          const rawData = await response.json()
          const validatedData = validator(rawData)
          
          // Cache successful result
          cacheManager.setCache(validatedData)
          return validatedData
        })()
        
        cacheManager.setPromise(fetchPromise)
        const result = await fetchPromise
        setData(result)
      } catch (err) {
        console.error(`Error loading data from ${url}:`, err)
        setError(err instanceof Error ? err.message : "Failed to load data")
        
        // Clear cache and promise on error to allow retries
        cacheManager.clearCache()
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [url, validator, cacheManager])

  return { data, loading, error }
}

export { createDataCache }