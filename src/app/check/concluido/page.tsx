'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

function DoneContent() {
  const router = useRouter()
  const params = useSearchParams()
  const offline = params.get('offline') === '1'
  const phase = params.get('phase') ?? 'departure'
  const isArrival = phase === 'arrival'

  useEffect(() => {
    // Se acessado pelo historico do browser (botao voltar), redireciona para scan
    const justCompleted = sessionStorage.getItem('fc_just_completed')
    if (!justCompleted) {
      router.replace('/check/selecionar')
      return
    }
    sessionStorage.removeItem('fc_just_completed')
  }, [router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#ebeff2' }}>
      <div className="text-center animate-fade-up max-w-sm w-full">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: offline ? 'rgba(234,179,8,0.12)' : isArrival ? 'rgba(34,197,94,0.12)' : 'rgba(248,105,36,0.12)', border: `2px solid ${offline ? '#eab308' : isArrival ? '#22c55e' : '#f86924'}` }}>
          {offline ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 2v10M12 16v2" stroke="#eab308" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : isArrival ? (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M3 12l1-5h16l1 5M3 12v5a1 1 0 001 1h1a1 1 0 001-1v-1h12v1a1 1 0 001 1h1a1 1 0 001-1v-5M3 12h18" stroke="#f86924" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 30, fontWeight: 800, color: '#555555', marginBottom: 8 }}>
          {offline ? 'SALVO OFFLINE' : isArrival ? 'CHEGADA REGISTRADA' : 'SAÍDA REGISTRADA'}
        </h1>

        <p style={{ color: '#5e6673', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          {offline
            ? 'Sem conexão no momento. Os dados foram salvos localmente e serão enviados automaticamente quando a internet estiver disponível.'
            : isArrival
            ? 'Viagem encerrada com sucesso. Todos os dados foram registrados e estão disponíveis no painel administrativo.'
            : 'Saída registrada com sucesso. Ao chegar ao destino, abra o app e selecione este veículo para registrar a chegada.'}
        </p>

        {!isArrival && !offline && (
          <div className="mb-6 px-4 py-3 rounded-xl text-left" style={{ background: 'rgba(33,39,113,0.04)', border: '1px solid rgba(33,39,113,0.08)' }}>
            <p style={{ color: '#f86924', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Lembrete</p>
            <p style={{ color: '#5e6673', fontSize: 12, lineHeight: 1.5 }}>Ao chegar: abra o FleetCheck → selecione o veículo → registre a chegada.</p>
          </div>
        )}

        <button onClick={() => router.replace('/check/selecionar')}
          style={{ width: '100%', padding: 14, borderRadius: 10, background: isArrival ? '#22c55e' : '#f86924', color: isArrival ? '#ebeff2' : 'white', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif" }}>
          {isArrival ? '✓ CONCLUÍDO' : 'OK, ENTENDIDO'}
        </button>
      </div>
    </main>
  )
}

export default function DonePage() {
  return <Suspense><DoneContent /></Suspense>
}
