import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const COMPANY_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json()
    if (!question?.trim()) return NextResponse.json({ answer: 'Nenhuma pergunta recebida.' }, { status: 400 })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch all needed data in parallel
    const [checklistsRes, vehiclesRes, usersRes] = await Promise.all([
      supabase.from('checklists')
        .select('id, status, created_at, closed_at, departure_km_final, arrival_km_final, departure_dt_final, arrival_dt_final, departure_items, arrival_occurrences, arrival_notes, departure_notes, vehicle:vehicles(plate, model, year), user:users(name, email)')
        .eq('company_id', COMPANY_ID)
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('vehicles').select('plate, model, year, last_km, last_check_at, active').eq('company_id', COMPANY_ID),
      supabase.from('users').select('name, email, role, active, created_at').eq('company_id', COMPANY_ID),
    ])

    const checklists = (checklistsRes.data ?? []).map(c => {
      const veh = Array.isArray(c.vehicle) ? c.vehicle[0] : c.vehicle
      const usr = Array.isArray(c.user) ? c.user[0] : c.user
      const depKm = c.departure_km_final
      const arrKm = c.arrival_km_final
      const rodado = depKm && arrKm && arrKm > depKm ? arrKm - depKm : null
      const nokItems = (c.departure_items ?? []).filter((i: { status: string }) => i.status === 'nok')
      const hasOcc = (c.arrival_occurrences ?? []).length > 0
      return {
        data: new Date(c.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora_saida: c.departure_dt_final ? new Date(c.departure_dt_final).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—',
        hora_chegada: c.arrival_dt_final ? new Date(c.arrival_dt_final).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null,
        status: c.status === 'open' ? 'em aberto' : 'concluída',
        veiculo_placa: veh?.plate ?? '—',
        veiculo_modelo: veh?.model ?? '—',
        veiculo_ano: veh?.year ?? '—',
        motorista: usr?.name ?? usr?.email ?? '—',
        km_saida: depKm,
        km_chegada: arrKm,
        km_rodado: rodado,
        pendencias: nokItems.map((i: { label?: string; nok_data?: Record<string, string> }) => ({
          item: i.label ?? 'item sem nome',
          detalhes: i.nok_data ? Object.values(i.nok_data).filter(Boolean).join(', ') : ''
        })),
        tem_ocorrencia_chegada: hasOcc,
        notas: c.arrival_notes ?? c.departure_notes ?? null,
      }
    })

    const vehicles = (vehiclesRes.data ?? []).map(v => ({
      placa: v.plate, modelo: v.model, ano: v.year,
      ultimo_km: v.last_km, ultimo_check: v.last_check_at ? new Date(v.last_check_at).toLocaleDateString('pt-BR') : 'nunca',
      ativo: v.active
    }))

    const drivers = (usersRes.data ?? [])
      .filter(u => u.role === 'driver')
      .map(u => ({ nome: u.name, email: u.email, ativo: u.active, cadastrado_em: new Date(u.created_at).toLocaleDateString('pt-BR') }))

    const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })

    const systemPrompt = `Você é o assistente de busca do FleetCheck, sistema de gestão de frota da ConsulData Teleprocessamento (Santos/SP).

Hoje é ${today}.

Você recebe perguntas em linguagem natural do gestor de frota e responde com base EXCLUSIVAMENTE nos dados reais fornecidos abaixo. Nunca invente dados. Se não encontrar a informação, diga claramente que não encontrou.

FROTA CADASTRADA:
${JSON.stringify(vehicles, null, 2)}

MOTORISTAS CADASTRADOS:
${JSON.stringify(drivers, null, 2)}

REGISTROS DE CHECKLIST (mais recentes primeiro):
${JSON.stringify(checklists, null, 2)}

REGRAS DE RESPOSTA:
- Responda sempre em português brasileiro, de forma clara e direta
- Use os dados acima para responder — nunca suponha ou invente
- Para perguntas sobre datas relativas ("segunda passada", "ontem", "semana passada"), calcule com base em hoje
- Quando encontrar o resultado, seja específico: nome do motorista, placa, horários, KMs
- Quando não encontrar, diga: "Não encontrei registros para essa consulta."
- Para placas, aceite correspondência parcial (ex: "final 02" pode ser FXC5F02 ou similar)
- Para nomes, aceite correspondência parcial (ex: "Xavier" pode ser "João Xavier")
- Para modelos, aceite correspondência parcial (ex: "Argo", "Ônix", "Gol")
- Formate números de KM com pontos (ex: 102.060 km)
- Seja conciso mas completo — inclua os dados relevantes sem enrolação`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: question }]
    })

    const answer = response.content[0].type === 'text' ? response.content[0].text : 'Não consegui processar sua pergunta.'
    return NextResponse.json({ answer })

  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ answer: 'Erro ao processar a busca. Tente novamente.' }, { status: 500 })
  }
}
