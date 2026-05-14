import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// POST — request admin access
export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email?.endsWith('@consuldata.com.br'))
    return NextResponse.json({ error: 'E-mail deve ser @consuldata.com.br.' }, { status: 400 })

  const supabase = adminClient()

  // Check if already exists
  const { data: existing } = await supabase
    .from('admin_invites')
    .select('id, status')
    .eq('email', email)
    .eq('company_id', COMPANY_ID)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Solicitação já existe e aguarda aprovação.' }, { status: 409 })

  const { error } = await supabase.from('admin_invites').insert({ email, company_id: COMPANY_ID })
  if (error) return NextResponse.json({ error: 'Erro ao registrar solicitação.' }, { status: 500 })

  return NextResponse.json({ success: true })
}

// PATCH — approve or reject invite
export async function PATCH(request: NextRequest) {
  const { inviteId, action, reviewerId } = await request.json()
  if (!inviteId || !action || !reviewerId) return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

  const supabase = adminClient()

  // Confirm reviewer is admin
  const { data: reviewer } = await supabase.from('users').select('role').eq('id', reviewerId).single()
  if (reviewer?.role !== 'admin') return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

  const { data: invite } = await supabase.from('admin_invites').select('email').eq('id', inviteId).single()
  if (!invite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })

  if (action === 'approve') {
    // Create/invite user via Supabase Auth — they'll receive a magic link
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(invite.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://fleetcheck.vercel.app'}/auth/callback?next=/admin`,
    })
    if (inviteError && !inviteError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'Erro ao enviar convite.' }, { status: 500 })
    }

    // Ensure user row exists with admin role
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const authUser = users.find(u => u.email === invite.email)
    if (authUser) {
      await supabase.from('users').upsert({
        id: authUser.id, email: invite.email, name: invite.email.split('@')[0],
        role: 'admin', company_id: COMPANY_ID, active: true,
      }, { onConflict: 'id' })
    }
  }

  // Update invite status
  await supabase.from('admin_invites').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: reviewerId,
  }).eq('id', inviteId)

  return NextResponse.json({ success: true })
}
