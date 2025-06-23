'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { District, validateDistrictsFile } from '@/lib/district-types'

interface DistrictMapInnerProps {
  selectedDistricts: number[]
  onDistrictSelect: (districtCode: number) => void
}

export default function DistrictMapInner({
  selectedDistricts,
  onDistrictSelect
}: DistrictMapInnerProps) {
  const [geoJsonLayers, setGeoJsonLayers] = useState<Array<District>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDistricts = async () => {
      try {
        // Load the combined file to get district codes and names
        const response = await fetch('/opt_districts.json')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const rawData = await response.json()
        const districtsData = validateDistrictsFile(rawData)

        // Create layers from the district data
        const layers: Array<District> = []
        for (const [key, district] of Object.entries(districtsData)) {
          try {
            // Use the geo_shape directly from the combined file
            layers.push(district)
          } catch (error) {
            console.warn(`Failed to load district ${key}:`, error)
          }
        }

        setGeoJsonLayers(layers)
      } catch (error) {
        console.error('Failed to load districts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDistricts()
  }, [])

  const getDistrictStyle = (districtCode: number) => {
    const isSelected = selectedDistricts.includes(districtCode)
    return {
      fillColor: isSelected ? '#3b82f6' : '#f8fafc',
      weight: isSelected ? 3 : 2,
      opacity: 1,
      color: isSelected ? '#1d4ed8' : '#475569',
      dashArray: '',
      fillOpacity: isSelected ? 0.8 : 0.2
    }
  }

  const handleDistrictClick = (districtCode: number) => {
    onDistrictSelect(districtCode)
  }

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg flex items-center justify-center h-full">
        <div className="text-gray-500">A carregar mapa...</div>
      </div>
    )
  }

  // Portugal bounds
  const portugalBounds = new LatLngBounds(
    [36.838, -9.733], // Southwest
    [42.280, -6.189]  // Northeast
  )

  return (
    <MapContainer
      center={[39.5, -8.0]}
      zoom={7}
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      bounds={portugalBounds}
      maxBounds={portugalBounds}
      minZoom={6}
      maxZoom={10}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geoJsonLayers.map((layer) => (
        <GeoJSON
          key={`district-${layer.code}`}
          data={layer.geo_shape}
          style={() => getDistrictStyle(layer.code)}
          eventHandlers={{
            click: () => handleDistrictClick(layer.code),
            mouseover: (e) => {
              const leafletLayer = e.target
              leafletLayer.setStyle({
                weight: 4,
                fillOpacity: 0.6,
                fillColor: '#60a5fa'
              })
            },
            mouseout: (e) => {
              const leafletLayer = e.target
              leafletLayer.setStyle(getDistrictStyle(layer.code))
            }
          }}
        />
      ))}
    </MapContainer>
  )
}