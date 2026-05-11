import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CONSULDATA_COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  const { email, name, cpf, birth_date, password } = await request.json()

  if (!email?.endsWith('@consuldata.com.br')) {
    return NextResponse.json({ error: 'E-mail deve ser @consuldata.com.br.' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Configuração incompleta. Fale com o administrador.' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // CPF ja cadastrado?
  const { data: existingCpf } = await supabase
    .from('users').select('id').eq('cpf', cpf).single()
  if (existingCpf) {
    return NextResponse.json({ error: 'CPF já cadastrado. Use a tela de login com seu e-mail.' }, { status: 409 })
  }

  // Cria usuario no Auth (email_confirm=true pula confirmacao por email)
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
    console.error('Auth error:', authError)
    return NextResponse.json({ error: 'Erro ao criar acesso. Fale com o administrador.' }, { status: 500 })
  }

  // Upsert: cobre caso onde trigger ja inseriu registro basico
  const { error: userError } = await supabase.from('users').upsert({
    id: authData.user.id,
    company_id: CONSULDATA_COMPANY_ID,
    name,
    email,
    role: 'driver',
    cpf,
    birth_date,
    generated_password: password,
    active: true,
  }, { onConflict: 'id' })

  if (userError) {
    console.error('User upsert error:', userError)
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: 'Erro ao salvar dados. Tente novamente.' }, { status: 500 })
  }

  // Marca convite como usado se existir
  await supabase.from('user_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('email', email).is('used_at', null)

  return NextResponse.json({ success: true })
}
