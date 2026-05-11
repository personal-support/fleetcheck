import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  const { email, name, cpf, birth_date, password } = await request.json()

  // Validate domain
  if (!email?.endsWith('@consuldata.com.br')) {
    return NextResponse.json({ error: 'E-mail deve ser @consuldata.com.br.' }, { status: 400 })
  }

  // Needs service role key to create user without email confirmation
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração incompleta. Fale com o administrador.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if CPF already registered
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('cpf', cpf)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'CPF já cadastrado. Fale com o administrador.' }, { status: 409 })
  }

  // Create auth user (email_confirm: true = skip confirmation email)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      return NextResponse.json({ error: 'E-mail já cadastrado. Use a tela de login.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Erro ao criar acesso. Fale com o administrador.' }, { status: 500 })
  }

  // Create user record in public.users
  const { error: userError } = await supabase.from('users').insert({
    id: authData.user.id,
    company_id: CONSULDATA_COMPANY_ID,
    name,
    email,
    role: 'driver',
    cpf,
    birth_date,
    generated_password: password,
  })

  if (userError) {
    // Rollback auth user
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erro ao salvar dados. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
