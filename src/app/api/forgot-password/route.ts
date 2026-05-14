import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email?.endsWith('@consuldata.com.br'))
    return NextResponse.json({ error: 'Use seu e-mail @consuldata.com.br.' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check user exists
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const found = users.find(u => u.email === email)
  if (!found) return NextResponse.json({ error: 'E-mail não cadastrado no sistema.' }, { status: 404 })

  // Send magic link that redirects to password recovery page
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fleetcheck.vercel.app'}/auth/callback?next=/recuperar-senha`,
    },
  })
  if (error) return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
