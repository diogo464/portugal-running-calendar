import { useState, useCallback } from 'react'
import { Coordinates, GeolocationPermission } from '@/lib/types'

interface GeolocationState {
  position: Coordinates | null
  permission: GeolocationPermission
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    permission: 'prompt',
    error: null,
    loading: false
  })

  const requestLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocalização não é suportada pelo navegador',
        permission: 'denied'
      }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Check current permission status
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' })
        if (permissionStatus.state === 'denied') {
          setState(prev => ({
            ...prev,
            permission: 'denied',
            loading: false,
            error: 'Permissão de localização negada'
          }))
          return
        }
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        )
      })

      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      }

      setState({
        position: coordinates,
        permission: 'granted',
        error: null,
        loading: false
      })
    } catch (error) {
      let errorMessage = 'Erro ao obter localização'
      let permission: GeolocationPermission = 'denied'

      if (error instanceof GeolocationPositionError) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de localização negada'
            permission = 'denied'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível'
            break
          case error.TIMEOUT:
            errorMessage = 'Tempo limite para obter localização'
            break
        }
      }

      setState({
        position: null,
        permission,
        error: errorMessage,
        loading: false
      })
    }
  }, [])

  const clearLocation = useCallback(() => {
    setState({
      position: null,
      permission: 'prompt',
      error: null,
      loading: false
    })
  }, [])

  return {
    ...state,
    requestLocation,
    clearLocation,
    hasLocation: state.position !== null
  }
}