'use client'

import { ConsuldataFooter } from '@/components/ConsuldataFooter'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackButton } from '@/components/BackButton'
import { createClient } from '@/lib/supabase/client'

interface Driver {
  id: string
  name: string
  email: string
  cpf: string | null
  birth_date: string | null
  generated_password: string | null
  active: boolean
  created_at: string
}

function formatCPF(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

function generatePassword(cpf: string, birthDate: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return ''
  const date = new Date(birthDate + 'T12:00:00')
  if (isNaN(date.getTime())) return ''
  const dd = String(date.getDate()).padStart(2, '0')
  const cpfGroup2 = digits.slice(3, 6)
  const yearLast2 = String(date.getFullYear()).slice(-2)
  const yearReversed = yearLast2.split('').reverse().join('')
  return `${dd}${cpfGroup2}${yearReversed}`
}

export default function AdminDriversPage() {
  const router = useRouter()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', name: '', cpf: '', birth_date: '' })

  useEffect(() => { loadDrivers() }, [])

  async function loadDrivers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('id, name, email, cpf, birth_date, generated_password, active, created_at')
      .eq('role', 'driver')
      .order('name')
    if (data) setDrivers(data as Driver[])
    setLoading(false)
  }

  async function registerDriver() {
    setError('')
    if (!form.email.endsWith('@consuldata.com.br')) { setError('E-mail deve ser @consuldata.com.br'); return }
    if (form.name.trim().split(' ').length < 2) { setError('Nome completo obrigatório'); return }
    if (form.cpf.replace(/\D/g, '').length !== 11) { setError('CPF inválido'); return }
    if (!form.birth_date) { setError('Data de nascimento obrigatória'); return }

    const password = generatePassword(form.cpf, form.birth_date)
    if (!password) { setError('Não foi possível gerar a senha'); return }

    setSaving(true)
    const res = await fetch('/api/register-driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.toLowerCase(), name: form.name.trim(), cpf: form.cpf.replace(/\D/g, ''), birth_date: form.birth_date, password }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao cadastrar'); setSaving(false); return }

    setNewPassword(password)
    setSaving(false)
    setForm({ email: '', name: '', cpf: '', birth_date: '' })
    loadDrivers()
  }

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(''), 2000)
  }

  function resetForm() { setShowForm(false); setNewPassword(''); setError('') }

  return (
    <main className="min-h-screen" style={{ background: '#ebeff2' }}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3" style={{ borderBottom: '1px solid #1a2040' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#5e6673', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#555555', flex: 1 }}>MOTORISTAS</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            style={{ padding: '7px 14px', borderRadius: 8, background: '#f86924', color: 'white', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            + Cadastrar
          </button>
        )}
      </div>

      {/* Info banner */}
      {!showForm && (
        <div className="mx-5 mt-4 p-4 rounded-xl" style={{ background: 'rgba(33,39,113,0.04)', border: '1px solid rgba(33,39,113,0.08)' }}>
          <p style={{ fontSize: 13, color: '#555555', lineHeight: 1.6 }}>
            Motoristas se cadastram em{' '}
            <span style={{ color: '#f86924', fontWeight: 600 }}>fleetcheck.vercel.app/register</span>{' '}
            usando e-mail <span style={{ color: '#f86924' }}>@consuldata.com.br</span>, CPF e data de nascimento.
            O sistema gera a senha automaticamente.
          </p>
          <p style={{ fontSize: 12, color: '#5e6673', marginTop: 6 }}>
            Se o motorista tiver dificuldade, use o botão <strong style={{ color: '#555555' }}>Cadastrar</strong> acima para fazer o cadastro por ele e anotar a senha gerada.
          </p>
        </div>
      )}

      {/* NEW PASSWORD CONFIRMATION */}
      {newPassword && (
        <div className="mx-5 mt-4 p-5 rounded-xl animate-fade-up" style={{ background: '#ffffff', border: '2px solid rgba(34,197,94,0.4)' }}>
          <p style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>✓ Motorista cadastrado</p>
          <p style={{ fontSize: 13, color: '#5e6673', marginBottom: 12 }}>Anote a senha e entregue ao motorista:</p>
          <div className="p-4 rounded-xl text-center mb-3" style={{ background: '#ebeff2', border: '1px solid rgba(248,105,36,0.3)' }}>
            <p style={{ fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Senha gerada</p>
            <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 38, fontWeight: 800, color: '#f86924', letterSpacing: 4 }}>{newPassword}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => copyText(newPassword, 'new')}
              style={{ flex: 1, padding: 10, borderRadius: 8, background: copiedId === 'new' ? 'rgba(34,197,94,0.1)' : '#dddddd', border: `1px solid ${copiedId === 'new' ? '#22c55e' : '#b6bcc2'}`, color: copiedId === 'new' ? '#22c55e' : '#e8eaf0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {copiedId === 'new' ? '✓ Copiado' : '📋 Copiar senha'}
            </button>
            <button onClick={resetForm}
              style={{ padding: '10px 14px', borderRadius: 8, background: 'none', border: '1px solid #1a2040', color: '#5e6673', fontSize: 13, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* REGISTER FORM */}
      {showForm && !newPassword && (
        <div className="mx-5 mt-4 p-5 rounded-xl animate-fade-up" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#555555' }}>Cadastrar motorista</h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', color: '#5e6673', cursor: 'pointer', fontSize: 18 }}>×</button>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { key: 'email', label: 'E-mail (@consuldata.com.br)', placeholder: 'nome@consuldata.com.br', type: 'email' },
              { key: 'name', label: 'Nome completo', placeholder: 'João da Silva', type: 'text' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</label>
                <input type={type} placeholder={placeholder} value={form[key as keyof typeof form]}
                  onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = '#f86924'} onBlur={e => e.target.style.borderColor = '#dddddd'} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>CPF</label>
              <input type="text" inputMode="numeric" placeholder="000.000.000-00" value={form.cpf} maxLength={14}
                onChange={e => setForm(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 15, outline: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 2 }}
                onFocus={e => e.target.style.borderColor = '#f86924'} onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Data de nascimento</label>
              <input type="date" value={form.birth_date} onChange={e => setForm(p => ({ ...p, birth_date: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#f86924'} onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={registerDriver} disabled={saving}
                style={{ flex: 1, padding: 11, borderRadius: 8, background: saving ? '#212771' : '#f86924', color: 'white', fontWeight: 600, fontSize: 13, border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Cadastrando...' : 'Cadastrar e gerar senha'}
              </button>
              <button onClick={resetForm}
                style={{ padding: '11px 14px', borderRadius: 8, background: 'none', border: '1px solid #1a2040', color: '#5e6673', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRIVERS LIST */}
      <div className="px-5 pt-5 pb-8 flex flex-col gap-3">
        <p style={{ fontSize: 11, color: '#5e6673', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {drivers.length} motorista{drivers.length !== 1 ? 's' : ''} cadastrado{drivers.length !== 1 ? 's' : ''}
        </p>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f86924', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && drivers.length === 0 && (
          <p style={{ color: '#5e6673', fontSize: 14, textAlign: 'center', paddingTop: 32 }}>
            Nenhum motorista cadastrado ainda.
          </p>
        )}

        {drivers.map(d => (
          <div key={d.id} className="p-4 rounded-xl" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(248,105,36,0.12)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f86924' }}>
                    {d.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#555555' }}>{d.name}</p>
                  <p style={{ fontSize: 12, color: '#5e6673' }}>{d.email}</p>
                </div>
              </div>
              {d.generated_password && (
                <button onClick={() => copyText(d.generated_password!, d.id)}
                  title="Copiar senha"
                  style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 6, background: copiedId === d.id ? 'rgba(34,197,94,0.1)' : '#ebeff2', border: `1px solid ${copiedId === d.id ? '#22c55e' : '#dddddd'}`, color: copiedId === d.id ? '#22c55e' : '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 1 }}>
                  {copiedId === d.id ? '✓' : d.generated_password}
                </button>
              )}
            </div>
            <div className="flex gap-2 mt-3" style={{ borderTop: '1px solid #1a2040', paddingTop: 10 }}>
              {d.cpf && <span style={{ fontSize: 11, color: '#5e6673' }}>CPF: {d.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>}
              <span style={{ fontSize: 11, color: '#5e6673', marginLeft: 'auto' }}>
                Desde {new Date(d.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <ConsuldataFooter />
      <BackButton href='/admin' label='Voltar para o painel' />
    </main>
  )
}
