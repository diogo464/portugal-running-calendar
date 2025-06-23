'use client'

import dynamic from 'next/dynamic'
import 'leaflet/dist/leaflet.css'

// Dynamic import the entire map component to prevent SSR issues
const DynamicMap = dynamic(() => import('./DistrictMapInner'), { 
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 rounded-lg flex items-center justify-center h-full">
      <div className="text-gray-500">A carregar mapa...</div>
    </div>
  )
})

interface DistrictMapProps {
  selectedDistricts: number[]
  onDistrictSelect: (districtCode: number) => void
  className?: string
}

export function DistrictMap({ 
  selectedDistricts, 
  onDistrictSelect, 
  className = "" 
}: DistrictMapProps) {
  return (
    <div className={className}>
      <DynamicMap 
        selectedDistricts={selectedDistricts}
        onDistrictSelect={onDistrictSelect}
      />
    </div>
  )
}