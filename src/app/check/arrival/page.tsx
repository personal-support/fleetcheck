'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Vehicle, ChecklistTemplate, ChecklistTemplateItem, ChecklistItemResult } from '@/types'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export default function ArrivalPage() {
  const router = useRouter()
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const [occurrences, setOccurrences] = useState<ChecklistItemResult[]>([])
  const [addingOccurrence, setAddingOccurrence] = useState(false)
  const [currentOccItem, setCurrentOccItem] = useState<ChecklistTemplateItem | null>(null)
  const [nokData, setNokData] = useState<Record<string, string>>({})
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoBlobs = useRef<Record<string, Blob>>({})

  const vehicle: Vehicle | null = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('fc_vehicle') ?? 'null') : null
  const checklistId = typeof window !== 'undefined' ? sessionStorage.getItem('fc_checklist_id') : null
  const km = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('fc_km') ?? '0') : 0
  const kmAuto = typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('fc_km_auto') ?? '0') : 0
  const kmWasManual = typeof window !== 'undefined' ? sessionStorage.getItem('fc_km_was_manual') === 'true' : false
  const dtAuto = typeof window !== 'undefined' ? sessionStorage.getItem('fc_dt_auto') ?? new Date().toISOString() : new Date().toISOString()
  const latAuto = typeof window !== 'undefined' ? parseFloat(sessionStorage.getItem('fc_lat_auto') ?? '0') || null : null
  const lngAuto = typeof window !== 'undefined' ? parseFloat(sessionStorage.getItem('fc_lng_auto') ?? '0') || null : null

  useEffect(() => {
    if (!vehicle || !checklistId) { router.replace('/check/scan'); return }
    loadTemplate()
  }, [])

  async function loadTemplate() {
    const supabase = createClient()
    const { data } = await supabase
      .from('checklist_templates').select('*')
      .eq('company_id', CONSULDATA_COMPANY_ID)
      .eq('vehicle_type', vehicle?.vehicle_type ?? 'leve')
      .eq('active', true).single()
    if (data) setTemplate(data as ChecklistTemplate)
  }

  function startAddOccurrence(item: ChecklistTemplateItem) {
    setCurrentOccItem(item)
    setNokData({})
    setPhotoBlob(null)
    setPhotoPreview('')
    setAddingOccurrence(true)
  }

  function saveOccurrence() {
    if (!currentOccItem) return
    const photoKey = `arr_photo_${currentOccItem.id}_${Date.now()}`
    if (photoBlob) photoBlobs.current[photoKey] = photoBlob
    setOccurrences(prev => [...prev, {
      id: currentOccItem.id,
      status: 'nok',
      nok_data: nokData,
      photo_url: photoBlob ? photoKey : undefined,
    }])
    setAddingOccurrence(false)
    setCurrentOccItem(null)
  }

  function removeOccurrence(idx: number) {
    setOccurrences(prev => prev.filter((_, i) => i !== idx))
  }

  async function finishArrival() {
    if (!vehicle || !checklistId) return
    setSaving(true)
    setError('')

    const supabase = createClient()
    const dtFinal = new Date().toISOString()
    let latFinal = latAuto, lngFinal = lngAuto, locationWasManual = false
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }))
      latFinal = pos.coords.latitude; lngFinal = pos.coords.longitude
    } catch { locationWasManual = true }

    // Upload occurrence photos
    let finalOccurrences = [...occurrences]
    for (const [key, blob] of Object.entries(photoBlobs.current)) {
      try {
        const path = `${vehicle.id}/arrival_${Date.now()}_${key}.jpg`
        const { data: uploaded } = await supabase.storage.from('checklist-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (uploaded) {
          const { data: urlData } = supabase.storage.from('checklist-photos').getPublicUrl(uploaded.path)
          finalOccurrences = finalOccurrences.map(o => o.photo_url === key ? { ...o, photo_url: urlData.publicUrl } : o)
        }
      } catch { /* skip photo upload */ }
    }

    const arrivalKmPhoto = sessionStorage.getItem('fc_km_photo') || null

    const { error: updateError } = await supabase.from('checklists').update({
      status: 'closed',
      closed_at: dtFinal,
      arrival_km_auto: kmAuto || null,
      arrival_km_final: km || null,
      arrival_km_was_manual: kmWasManual,
      arrival_km_photo_url: arrivalKmPhoto,
      arrival_dt_auto: dtAuto,
      arrival_dt_final: dtFinal,
      arrival_dt_was_manual: false,
      arrival_lat_auto: latAuto,
      arrival_lng_auto: lngAuto,
      arrival_lat_final: latFinal,
      arrival_lng_final: lngFinal,
      arrival_location_was_manual: locationWasManual,
      arrival_occurrences: finalOccurrences,
      arrival_notes: notes || null,
      synced_at: dtFinal,
    }).eq('id', checklistId)

    if (updateError) {
      setError('Erro ao registrar chegada. Tente novamente.')
      setSaving(false)
      return
    }

    // Update vehicle
    await supabase.from('vehicles').update({
      last_km: km,
      last_check_at: dtFinal,
      last_location_lat: latFinal,
      last_location_lng: lngFinal,
    }).eq('id', vehicle.id)

    // Clear session
    ;['fc_vehicle','fc_checklist_id','fc_phase','fc_km','fc_km_auto','fc_km_was_manual','fc_dt_auto','fc_lat_auto','fc_lng_auto','fc_km_photo'].forEach(k => sessionStorage.removeItem(k))

    sessionStorage.setItem('fc_just_completed', '1'); router.push('/check/done?phase=arrival')
  }

  if (!vehicle) return null

  const items: ChecklistTemplateItem[] = template?.items.sort((a, b) => a.order - b.order) ?? []

  // ADD OCCURRENCE FORM
  if (addingOccurrence && currentOccItem) {
    const nokFields = currentOccItem.if_nok?.fields ?? []
    const photoField = nokFields.find(f => f.type === 'photo')
    return (
      <main className="min-h-screen flex flex-col" style={{ background: '#070a14' }}>
        <div className="px-5 pt-6 pb-4">
          <button onClick={() => setAddingOccurrence(false)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, padding: 0 }}>← Cancelar</button>
          <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: '#ef4444', marginTop: 8 }}>
            {currentOccItem.icon} {currentOccItem.label} — OCORRÊNCIA
          </h2>
        </div>
        <div className="flex-1 flex flex-col px-5 gap-4">
          {nokFields.filter(f => f.type !== 'photo').map(field => (
            <div key={field.id}>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{field.label}</label>
              {field.type === 'select' ? (
                <div className="flex flex-wrap gap-2">
                  {field.options?.map(opt => (
                    <button key={opt} onClick={() => setNokData(prev => ({ ...prev, [field.id]: opt }))}
                      style={{ padding: '8px 14px', borderRadius: 8, fontSize: 13, background: nokData[field.id] === opt ? '#fcb52f' : '#0d1124', border: `1px solid ${nokData[field.id] === opt ? '#fcb52f' : '#1a2040'}`, color: nokData[field.id] === opt ? 'white' : '#6b7280', cursor: 'pointer' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input type="text" placeholder={field.placeholder} value={nokData[field.id] ?? ''}
                  onChange={e => setNokData(prev => ({ ...prev, [field.id]: e.target.value }))}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0d1124', border: '1px solid #1a2040', color: '#e8eaf0', fontSize: 14, outline: 'none' }} />
              )}
            </div>
          ))}
          {photoField && (
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Foto (opcional)</label>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoBlob(f); setPhotoPreview(URL.createObjectURL(f)) } }} />
              {!photoPreview ? (
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: 16, borderRadius: 12, background: '#0d1124', border: '2px dashed #1a2040', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}>📸 Tirar foto</button>
              ) : (
                <div className="relative">
                  <img src={photoPreview} className="rounded-xl w-full object-cover" style={{ maxHeight: 160 }} />
                  <button onClick={() => { setPhotoBlob(null); setPhotoPreview('') }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                </div>
              )}
            </div>
          )}
          <button onClick={saveOccurrence}
            style={{ width: '100%', padding: 14, borderRadius: 10, background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', marginTop: 'auto', marginBottom: 24 }}>
            SALVAR OCORRÊNCIA
          </button>
        </div>
      </main>
    )
  }

  // ARRIVAL MAIN SCREEN
  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#070a14' }}>
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{vehicle.plate} · Registro de chegada</p>
        </div>
        <div className="step-bar"><div className="step-bar-fill" style={{ width: '85%' }} /></div>
      </div>

      <div className="flex-1 flex flex-col px-5 pb-6 gap-4 animate-fade-up">
        <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#e8eaf0' }}>CHEGADA</h2>

        {/* KM summary */}
        <div className="p-4 rounded-xl" style={{ background: '#0d1124', border: '1px solid #1a2040' }}>
          <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>KM de chegada</p>
          <div className="flex items-center justify-between">
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#fcb52f' }}>
              {km.toLocaleString('pt-BR')} km
            </p>
            {kmWasManual && <span style={{ fontSize: 10, color: '#eab308', padding: '2px 8px', borderRadius: 12, background: 'rgba(234,179,8,0.1)' }}>digitado</span>}
            {!kmWasManual && kmAuto > 0 && <span style={{ fontSize: 10, color: '#22c55e', padding: '2px 8px', borderRadius: 12, background: 'rgba(34,197,94,0.1)' }}>lido por IA</span>}
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            Data/hora: {new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} (automático)
          </p>
        </div>

        {/* Occurrences */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p style={{ fontSize: 13, fontWeight: 600, color: '#e8eaf0' }}>Ocorrências na chegada</p>
            <span style={{ fontSize: 11, color: '#6b7280' }}>Opcional</span>
          </div>

          {occurrences.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {occurrences.map((occ, idx) => {
                const item = items.find(i => i.id === occ.id)
                return (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div>
                      <p style={{ fontSize: 13, color: '#e8eaf0' }}>{item?.icon} {item?.label}</p>
                      {occ.nok_data && Object.values(occ.nok_data).filter(Boolean).length > 0 && (
                        <p style={{ fontSize: 11, color: '#6b7280' }}>{Object.values(occ.nok_data).filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <button onClick={() => removeOccurrence(idx)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                )
              })}
            </div>
          )}

          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Identificou algum problema durante ou após a viagem?</p>
          <div className="grid grid-cols-1 gap-2">
            {items.map(item => (
              <button key={item.id} onClick={() => startAddOccurrence(item)}
                style={{ padding: '12px 16px', borderRadius: 10, background: '#0d1124', border: '1px solid #1a2040', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>+ {item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Observações (opcional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguma observação sobre a viagem..."
            rows={3}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#0d1124', border: '1px solid #1a2040', color: '#e8eaf0', fontSize: 14, outline: 'none', resize: 'none' }}
            onFocus={e => e.target.style.borderColor = '#fcb52f'} onBlur={e => e.target.style.borderColor = '#1a2040'} />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

        <button onClick={finishArrival} disabled={saving}
          style={{ width: '100%', padding: 16, borderRadius: 12, background: saving ? '#7a5c0a' : '#22c55e', color: saving ? '#e8eaf0' : '#070a14', fontWeight: 800, fontSize: 16, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Barlow Condensed', sans-serif', letterSpacing: '0.5px" }}>
          {saving ? 'Registrando...' : '✓ CONFIRMAR CHEGADA'}
        </button>
      </div>
    </main>
  )
}
