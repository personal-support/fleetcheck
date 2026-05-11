'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { savePendingChecklist } from '@/lib/db'
import type { Vehicle, ChecklistTemplate, ChecklistTemplateItem, ChecklistItemResult } from '@/types'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function ChecklistItemsPage() {
  const router = useRouter()
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<ChecklistItemResult[]>([])
  const [showNok, setShowNok] = useState(false)
  const [nokData, setNokData] = useState<Record<string, string>>({})
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoBlobs = useRef<Record<string, Blob>>({})

  const vehicle: Vehicle | null = typeof window !== 'undefined'
    ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null
  const km = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('fc_km') ?? '0') : 0

  useEffect(() => {
    if (!vehicle) { router.replace('/check/scan'); return }
    loadTemplate()
  }, [])

  async function loadTemplate() {
    const supabase = createClient()
    const { data } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('company_id', CONSULDATA_COMPANY_ID)
      .eq('vehicle_type', vehicle?.vehicle_type ?? 'leve')
      .eq('active', true)
      .single()

    if (data) {
      setTemplate(data as ChecklistTemplate)
      setResults((data as ChecklistTemplate).items.map(item => ({ id: item.id, status: null })))
    }
  }

  if (!template || !vehicle) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#0a0c0f' }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
      </main>
    )
  }

  const items: ChecklistTemplateItem[] = template.items.sort((a, b) => a.order - b.order)
  const currentItem = items[currentIndex]
  const progress = ((currentIndex) / items.length) * 50 + 50 // 50-100% (after odometer)
  const isDone = currentIndex >= items.length

  function handleOk() {
    const updated = [...results]
    updated[currentIndex] = { id: currentItem.id, status: 'ok' }
    setResults(updated)
    setShowNok(false)
    setNokData({})
    setPhotoBlob(null)
    setPhotoPreview('')
    setCurrentIndex(prev => prev + 1)
  }

  function handleNok() {
    setShowNok(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBlob(file)
    setPhotoPreview(URL.createObjectURL(file))
    setNokData(prev => ({ ...prev, foto: `photo_${currentItem.id}` }))
  }

  function submitNok() {
    const photoKey = `photo_${currentItem.id}`
    if (photoBlob) photoBlobs.current[photoKey] = photoBlob

    const updated = [...results]
    updated[currentIndex] = {
      id: currentItem.id,
      status: 'nok',
      nok_data: nokData,
      photo_url: photoBlob ? photoKey : undefined,
    }
    setResults(updated)
    setShowNok(false)
    setNokData({})
    setPhotoBlob(null)
    setPhotoPreview('')
    setCurrentIndex(prev => prev + 1)
  }

  async function finishChecklist() {
    if (!vehicle) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: appUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    const checklistData = {
      company_id: CONSULDATA_COMPANY_ID,
      vehicle_id: vehicle.id,
      user_id: user.id,
      template_id: template?.id ?? null,
      km_reading: km,
      km_photo_url: null as string | null,
      location_lat: null as number | null,
      location_lng: null as number | null,
      items: results,
      notes: null,
      status: 'submitted' as const,
      created_at: new Date().toISOString(),
    }

    // Try geo
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
      )
      checklistData.location_lat = pos.coords.latitude
      checklistData.location_lng = pos.coords.longitude
    } catch { /* skip */ }

    if (navigator.onLine) {
      try {
        // Upload km photo if any
        const kmPhotoKey = sessionStorage.getItem('fc_km_photo_key')
        // Upload item photos
        for (const [key, blob] of Object.entries(photoBlobs.current)) {
          const path = `${vehicle.id}/${Date.now()}_${key}.jpg`
          const { data: uploaded } = await supabase.storage
            .from('checklist-photos')
            .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (uploaded) {
            const { data: urlData } = supabase.storage
              .from('checklist-photos')
              .getPublicUrl(uploaded.path)
            checklistData.items = checklistData.items.map(item =>
              item.photo_url === key ? { ...item, photo_url: urlData.publicUrl } : item
            )
          }
        }

        const { error } = await supabase.from('checklists').insert({
          ...checklistData,
          synced_at: new Date().toISOString(),
        })

        if (!error) {
          // Update vehicle last_km
          await supabase.from('vehicles').update({
            last_km: km,
            last_check_at: new Date().toISOString(),
            last_location_lat: checklistData.location_lat,
            last_location_lng: checklistData.location_lng,
          }).eq('id', vehicle.id)

          sessionStorage.removeItem('fc_vehicle')
          sessionStorage.removeItem('fc_km')
          sessionStorage.removeItem('fc_km_photo')
          router.push('/check/done')
          return
        }
      } catch { /* fall through to offline */ }
    }

    // Save offline
    await savePendingChecklist({
      localId: `local_${Date.now()}`,
      checklist: checklistData,
      photoBlobs: photoBlobs.current,
      createdAt: Date.now(),
    })

    router.push('/check/done?offline=1')
  }

  // DONE screen
  if (isDone) {
    const nokCount = results.filter(r => r.status === 'nok').length
    return (
      <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
        <div className="px-5 pt-6 pb-2">
          <div className="step-bar"><div className="step-bar-fill" style={{ width: '95%' }} /></div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 animate-fade-up">
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#e8eaf0', marginBottom: 4, textAlign: 'center' }}>
            RESUMO DO CHECKLIST
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 24 }}>{vehicle.plate} · {km.toLocaleString('pt-BR')} km</p>

          <div className="w-full max-w-sm">
            {results.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid #1e2229' }}>
                <span style={{ color: '#e8eaf0', fontSize: 14 }}>
                  {items[i]?.icon} {items[i]?.label}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                  background: r.status === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: r.status === 'ok' ? '#22c55e' : '#ef4444',
                }}>
                  {r.status === 'ok' ? 'OK' : 'PENDÊNCIA'}
                </span>
              </div>
            ))}
          </div>

          {nokCount > 0 && (
            <div className="mt-5 w-full max-w-sm px-4 py-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p style={{ color: '#ef4444', fontSize: 13 }}>
                ⚠️ {nokCount} pendência{nokCount > 1 ? 's' : ''} registrada{nokCount > 1 ? 's' : ''}. O administrador será notificado.
              </p>
            </div>
          )}

          <button
            onClick={finishChecklist}
            disabled={saving}
            style={{
              marginTop: 24, width: '100%', maxWidth: 360, padding: 14,
              borderRadius: 10, background: saving ? '#7c3d12' : '#f97316',
              color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Enviando...' : 'ENVIAR CHECKLIST →'}
          </button>
        </div>
      </main>
    )
  }

  // ITEM STEP
  const nokFields = currentItem.if_nok?.fields ?? []
  const photoField = nokFields.find(f => f.type === 'photo')
  const isPhotoRequired = photoField?.required

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#0a0c0f' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {vehicle.plate} · Item {currentIndex + 1} de {items.length}
          </p>
          <span style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>
            {currentIndex}/{items.length} ok
          </span>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: `${progress}%` }} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5">
        {!showNok ? (
          /* OK / NOK choice */
          <div className="flex-1 flex flex-col justify-center animate-fade-up">
            <div className="text-center mb-10">
              <div className="text-5xl mb-4">{currentItem.icon}</div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 36, fontWeight: 800, color: '#e8eaf0', marginBottom: 8 }}>
                {currentItem.label.toUpperCase()}
              </h2>
              <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.5 }}>
                {currentItem.description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleNok}
                style={{
                  padding: '20px 0', borderRadius: 14,
                  background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', minHeight: 80,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                ⚠️ PROBLEMA
              </button>
              <button
                onClick={handleOk}
                style={{
                  padding: '20px 0', borderRadius: 14,
                  background: 'rgba(34,197,94,0.08)', border: '2px solid rgba(34,197,94,0.3)',
                  color: '#22c55e', fontSize: 16, fontWeight: 700,
                  cursor: 'pointer', minHeight: 80,
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}
              >
                ✓ OK
              </button>
            </div>
          </div>
        ) : (
          /* NOK detail form */
          <div className="flex-1 flex flex-col animate-fade-up gap-4">
            <div>
              <button onClick={() => setShowNok(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 12 }}>
                ← Voltar
              </button>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: '#ef4444' }}>
                {currentItem.icon} {currentItem.label} — PROBLEMA
              </h2>
            </div>

            {nokFields.filter(f => f.type !== 'photo').map(field => (
              <div key={field.id}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setNokData(prev => ({ ...prev, [field.id]: opt }))}
                        style={{
                          padding: '8px 14px', borderRadius: 8, fontSize: 13,
                          background: nokData[field.id] === opt ? '#f97316' : '#111318',
                          border: `1px solid ${nokData[field.id] === opt ? '#f97316' : '#1e2229'}`,
                          color: nokData[field.id] === opt ? 'white' : '#6b7280',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={nokData[field.id] ?? ''}
                    onChange={e => setNokData(prev => ({ ...prev, [field.id]: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 16px', borderRadius: 10,
                      background: '#111318', border: '1px solid #1e2229',
                      color: '#e8eaf0', fontSize: 14, outline: 'none',
                    }}
                  />
                )}
              </div>
            ))}

            {/* Photo */}
            {photoField && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Foto {isPhotoRequired ? '(obrigatória)' : '(opcional)'}
                </label>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                  className="hidden" onChange={handlePhotoChange} />

                {!photoPreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%', padding: 16, borderRadius: 12,
                      background: '#111318', border: '2px dashed #1e2229',
                      color: '#6b7280', cursor: 'pointer', fontSize: 14,
                    }}
                  >
                    📸 Tirar foto
                  </button>
                ) : (
                  <div className="relative">
                    <img src={photoPreview} alt="Foto" className="rounded-xl w-full object-cover" style={{ maxHeight: 160 }} />
                    <button
                      onClick={() => { setPhotoBlob(null); setPhotoPreview(''); setNokData(p => { const n = {...p}; delete n.foto; return n }) }}
                      style={{
                        position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                        borderRadius: '50%', background: 'rgba(0,0,0,0.6)',
                        border: 'none', color: 'white', cursor: 'pointer', fontSize: 14,
                      }}
                    >×</button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={submitNok}
              disabled={isPhotoRequired && !photoBlob}
              style={{
                width: '100%', padding: 14, borderRadius: 10, marginTop: 'auto', marginBottom: 20,
                background: isPhotoRequired && !photoBlob ? '#2a2f38' : '#ef4444',
                color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
                cursor: isPhotoRequired && !photoBlob ? 'not-allowed' : 'pointer',
              }}
            >
              REGISTRAR PENDÊNCIA →
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
