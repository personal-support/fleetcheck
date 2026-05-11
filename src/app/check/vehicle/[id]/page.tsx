'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VehicleDeepLinkPage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = params.id as string
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [message, setMessage] = useState('Identificando veículo...')

  useEffect(() => { handleDeepLink() }, [vehicleId])

  async function handleDeepLink() {
    const supabase = createClient()

    // Check auth — redirect to login if needed
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      sessionStorage.setItem('fc_redirect', `/check/vehicle/${vehicleId}`)
      router.replace('/login')
      return
    }

    setMessage('Carregando veículo...')
    const { data: vehicle, error } = await supabase
      .from('vehicles').select('*').eq('id', vehicleId).eq('active', true).single()

    if (error || !vehicle) { setStatus('error'); return }

    setMessage('Verificando viagens em aberto...')

    // Open checklist on this vehicle?
    const { data: vehicleOpen } = await supabase
      .from('checklists').select('id')
      .eq('vehicle_id', vehicleId).eq('status', 'open').limit(1).single()

    if (vehicleOpen) {
      sessionStorage.setItem('fc_vehicle', JSON.stringify(vehicle))
      sessionStorage.setItem('fc_checklist_id', vehicleOpen.id)
      sessionStorage.setItem('fc_phase', 'arrival')
      router.replace('/check/odometer')
      return
    }

    // Driver has open checklist on another vehicle?
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const { data: driverOpen } = await supabase
        .from('checklists').select('id, vehicle_id')
        .eq('user_id', authUser.id).eq('status', 'open').limit(1).single()

      if (driverOpen) {
        // Go to scan to show the warning with action button
        sessionStorage.setItem('fc_pending_vehicle', JSON.stringify(vehicle))
        router.replace('/check/scan')
        return
      }
    }

    // All clear — start departure
    sessionStorage.setItem('fc_vehicle', JSON.stringify(vehicle))
    sessionStorage.removeItem('fc_checklist_id')
    sessionStorage.setItem('fc_phase', 'departure')
    router.replace('/check/odometer')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#f0f2f9' }}>
      <div className="text-center animate-fade-up">
        {status === 'loading' ? (
          <>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#fcb52f' }}>
              <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
                <path d="M4 8h24M4 8v16a2 2 0 002 2h20a2 2 0 002-2V8M4 8l4-4h16l4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="10" cy="20" r="2" fill="white"/>
                <circle cx="22" cy="20" r="2" fill="white"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#0f1535', marginBottom: 12 }}>
              FLEET<span style={{ color: '#fcb52f' }}>CHECK</span>
            </h1>
            <div className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: '#fcb52f', borderTopColor: 'transparent' }} />
              <p style={{ color: '#64748b', fontSize: 14 }}>{message}</p>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: '#ef4444', fontSize: 15, marginBottom: 16 }}>Veículo não encontrado ou inativo.</p>
            <button onClick={() => router.replace('/check/scan')}
              style={{ padding: '12px 24px', borderRadius: 10, background: '#fcb52f', color: 'white', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>
              Ir para lista de veículos
            </button>
          </>
        )}
      </div>
    </main>
  )
}
