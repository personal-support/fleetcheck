import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fleetcheck.vercel.app'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email?.endsWith('@consuldata.com.br') && !email?.endsWith('@consuldata.local'))
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check user exists and get role
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const found = users.find(u => u.email === email)
  if (!found) return NextResponse.json({ error: 'E-mail não cadastrado no sistema.' }, { status: 404 })

  const { data: userData } = await supabase.from('users').select('role').eq('id', found.id).single()
  const isAdmin = userData?.role === 'admin'

  // Admin → password reset link → /definir-senha
  // Driver → OTP magic link → /recuperar-senha (formula CPF)
  const redirectTo = isAdmin
    ? `${APP_URL}/auth/callback?next=/definir-senha`
    : `${APP_URL}/auth/callback?next=/recuperar-senha`

  const { error: linkError } = await supabase.auth.admin.generateLink({
    type: isAdmin ? 'recovery' : 'magiclink',
    email,
    options: { redirectTo },
  })
  if (linkError) return NextResponse.json({ error: 'Erro ao enviar e-mail.' }, { status: 500 })

  return NextResponse.json({ success: true })
}
