'use client'

import { useEffect } from 'react'

interface Point {
  lat: number
  lng: number
  type: 'departure' | 'arrival'
  plate: string
}

interface MapViewProps {
  points: Point[]
}

export default function MapView({ points }: MapViewProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || points.length === 0) return

    let map: L.Map | null = null

    async function initMap() {
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css' as never)

      const container = document.getElementById('leaflet-map')
      if (!container) return

      // Avoid double init
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      // Center on centroid of points
      const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length
      const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length

      map = L.map('leaflet-map').setView([avgLat, avgLng], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      // Add markers
      points.forEach(p => {
        const isDep = p.type === 'departure'
        const color = isDep ? '#212771' : '#35bc7a'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })
        L.marker([p.lat, p.lng], { icon })
          .addTo(map!)
          .bindPopup(`<b>${p.plate}</b><br/>${isDep ? '🚗 Saída' : '✅ Chegada'}`, { className: 'fc-popup' })
      })

      // Fit bounds to all points
      if (points.length > 1) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngExpression))
        map.fitBounds(bounds, { padding: [24, 24] })
      }
    }

    initMap()

    return () => {
      if (map) { map.remove(); map = null }
    }
  }, [points])

  if (points.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ebeff2' }}>
        <p style={{ fontSize: 13, color: '#5e6673' }}>Sem dados de localização no período</p>
      </div>
    )
  }

  return <div id="leaflet-map" style={{ height: '100%', width: '100%' }} />
}
