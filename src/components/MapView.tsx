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

// Group nearby points into clusters
function cluster(points: Point[], radiusDeg = 0.003) {
  const used = new Set<number>()
  const clusters: Array<{ lat: number; lng: number; type: 'departure' | 'arrival'; count: number; plates: string[] }> = []
  points.forEach((p, i) => {
    if (used.has(i)) return
    const group = { lat: p.lat, lng: p.lng, type: p.type, count: 1, plates: [p.plate] }
    for (let j = i + 1; j < points.length; j++) {
      if (used.has(j)) continue
      const q = points[j]
      if (p.type !== q.type) continue
      const dist = Math.sqrt(Math.pow(p.lat - q.lat, 2) + Math.pow(p.lng - q.lng, 2))
      if (dist < radiusDeg) {
        group.count++
        group.plates.push(q.plate)
        used.add(j)
      }
    }
    used.add(i)
    clusters.push(group)
  })
  return clusters
}

export default function MapView({ points }: MapViewProps) {
  useEffect(() => {
    if (typeof window === 'undefined' || points.length === 0) return

    let map: import('leaflet').Map | null = null

    async function initMap() {
      const L = (await import('leaflet')).default

      // Inject leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }

      const container = document.getElementById('leaflet-map')
      if (!container) return
      if ((container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return

      const avgLat = points.reduce((s, p) => s + p.lat, 0) / points.length
      const avgLng = points.reduce((s, p) => s + p.lng, 0) / points.length

      map = L.map('leaflet-map', { zoomControl: true }).setView([avgLat, avgLng], 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Cluster points for heat map effect
      const departureClusters = cluster(points.filter(p => p.type === 'departure'))
      const arrivalClusters = cluster(points.filter(p => p.type === 'arrival'))

      const maxCount = Math.max(...[...departureClusters, ...arrivalClusters].map(c => c.count), 1)

      // Draw departure clusters
      departureClusters.forEach(c => {
        const radius = 10 + (c.count / maxCount) * 20
        const opacity = 0.5 + (c.count / maxCount) * 0.4
        L.circleMarker([c.lat, c.lng], {
          radius,
          color: '#212771',
          fillColor: '#212771',
          fillOpacity: opacity,
          weight: 2,
        }).addTo(map!)
          .bindPopup(`
            <div style="font-family:'Open Sans',sans-serif;font-size:12px;min-width:120px">
              <b style="color:#212771">🚗 Saída</b><br/>
              ${[...new Set(c.plates)].join(', ')}<br/>
              <span style="color:#8d949a">${c.count} registro${c.count > 1 ? 's' : ''}</span>
            </div>
          `)
      })

      // Draw arrival clusters
      arrivalClusters.forEach(c => {
        const radius = 10 + (c.count / maxCount) * 20
        const opacity = 0.5 + (c.count / maxCount) * 0.4
        L.circleMarker([c.lat, c.lng], {
          radius,
          color: '#35bc7a',
          fillColor: '#35bc7a',
          fillOpacity: opacity,
          weight: 2,
        }).addTo(map!)
          .bindPopup(`
            <div style="font-family:'Open Sans',sans-serif;font-size:12px;min-width:120px">
              <b style="color:#35bc7a">✅ Chegada</b><br/>
              ${[...new Set(c.plates)].join(', ')}<br/>
              <span style="color:#8d949a">${c.count} registro${c.count > 1 ? 's' : ''}</span>
            </div>
          `)
      })

      // Draw lines connecting departure → arrival for same vehicle (last 20)
      const recentPoints = points.slice(0, 40)
      const deps = recentPoints.filter(p => p.type === 'departure')
      const arrs = recentPoints.filter(p => p.type === 'arrival')
      deps.forEach(dep => {
        const arr = arrs.find(a => a.plate === dep.plate)
        if (!arr) return
        L.polyline([[dep.lat, dep.lng], [arr.lat, arr.lng]], {
          color: '#f86924',
          weight: 1.5,
          opacity: 0.4,
          dashArray: '5, 5',
        }).addTo(map!)
      })

      // Fit bounds
      if (points.length > 1) {
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [32, 32] })
      }
    }

    initMap()
    return () => { if (map) { map.remove(); map = null } }
  }, [points])

  if (points.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ebeff2' }}>
        <p style={{ fontSize: 13, color: '#5e6673' }}>Sem dados de localização no período</p>
      </div>
    )
  }

  return (
    <>
      <div id="leaflet-map" style={{ height: '100%', width: '100%' }} />
      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 10px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important; border: 1px solid #dddddd; }
        .leaflet-popup-tip { background: #fff !important; }
      `}</style>
    </>
  )
}
