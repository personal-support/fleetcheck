'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/check/scan')
      } else {
        router.replace('/login')
      }
    })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#0a0c0f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#f97316', borderTopColor: 'transparent' }} />
    </main>
  )
}
