'use client'

import { ConsuldataFooter } from '@/components/ConsuldataFooter'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      // Check role and redirect accordingly
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.session.user.id)
        .single()

      if (user?.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/check/selecionar')
      }
    })
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: '#ebeff2' }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: '#f86924', borderTopColor: 'transparent' }} />

      <ConsuldataFooter />
    </main>
  )
}
