import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CONSULDATA_COMPANY_ID = 'b2c3d4e5-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  const { email, name, cpf, birth_date, password } = await request.json()

  if (!email?.endsWith('@fleetcheck.com.br') && !email?.endsWith('@fleetcheck.local')) {
    return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 })
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

// PATCH — reset password for existing driver
export async function PATCH(request: NextRequest) {
  const { email, cpf, birth_date } = await request.json()
  if (!email || !cpf || !birth_date) {
    return NextResponse.json({ error: 'Dados insuficientes.' }, { status: 400 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return NextResponse.json({ error: 'Configuração incompleta.' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Regenerate password using same formula
  function generatePassword(cpfDigits: string, birthDate: string): string {
    const date = new Date(birthDate + 'T12:00:00')
    if (isNaN(date.getTime())) return ''
    const dd = String(date.getDate()).padStart(2, '0')
    const cpfGroup2 = cpfDigits.slice(3, 6)
    const yearReversed = String(date.getFullYear()).slice(-2).split('').reverse().join('')
    return `${dd}${cpfGroup2}${yearReversed}`
  }

  const password = generatePassword(cpf, birth_date)
  if (!password) return NextResponse.json({ error: 'Erro ao gerar senha.' }, { status: 400 })

  // Find user by email
  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) return NextResponse.json({ error: 'Erro ao buscar usuário.' }, { status: 500 })

  const authUser = users.find(u => u.email === email)
  if (!authUser) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })

  // Update password in Auth
  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, { password })
  if (updateError) return NextResponse.json({ error: 'Erro ao atualizar senha.' }, { status: 500 })

  // Update generated_password in users table
  await supabase.from('users').update({ generated_password: password }).eq('id', authUser.id)

  return NextResponse.json({ success: true, password })
}
