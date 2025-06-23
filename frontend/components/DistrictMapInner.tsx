'use client'

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { LatLngBounds } from 'leaflet'
import { useDistricts } from '@/hooks/useDistricts'

interface DistrictMapInnerProps {
  selectedDistricts: number[]
  onDistrictSelect: (districtCode: number) => void
}

export default function DistrictMapInner({
  selectedDistricts,
  onDistrictSelect
}: DistrictMapInnerProps) {
  const { districts, loading, error } = useDistricts()

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

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg flex items-center justify-center h-full">
        <div className="text-red-600">Erro ao carregar distritos: {error}</div>
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

      {districts.map((district) => (
        <GeoJSON
          key={`district-${district.code}`}
          data={district.geo_shape}
          style={() => getDistrictStyle(district.code)}
          eventHandlers={{
            click: () => handleDistrictClick(district.code),
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
              leafletLayer.setStyle(getDistrictStyle(district.code))
            }
          }}
        />
      ))}
    </MapContainer>
  )
}