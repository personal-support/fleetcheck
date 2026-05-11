'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function DoneContent() {
  const router = useRouter()
  const params = useSearchParams()
  const offline = params.get('offline') === '1'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#0a0c0f' }}>
      <div className="text-center animate-fade-up max-w-sm w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: offline ? 'rgba(234,179,8,0.12)' : 'rgba(34,197,94,0.12)', border: `2px solid ${offline ? '#eab308' : '#22c55e'}` }}>
          {offline ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v10M12 16v2M4.93 4.93l14.14 14.14" stroke="#eab308" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, color: '#e8eaf0', marginBottom: 8 }}>
          {offline ? 'SALVO OFFLINE' : 'CHECKLIST ENVIADO'}
        </h1>

        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
          {offline
            ? 'Sem conexão no momento. O checklist foi salvo localmente e será enviado automaticamente quando a internet estiver disponível.'
            : 'Checklist registrado com sucesso. O histórico já está disponível no painel administrativo.'}
        </p>

        <button
          onClick={() => router.push('/check/scan')}
          style={{
            width: '100%', padding: 14, borderRadius: 10,
            background: '#f97316', color: 'white',
            fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer',
          }}
        >
          NOVO CHECKLIST
        </button>
      </div>
    </main>
  )
}

export default function DonePage() {
  return (
    <Suspense>
      <DoneContent />
    </Suspense>
  )
}
