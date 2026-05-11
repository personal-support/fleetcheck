'use client'

import { ConsuldataFooter } from '@/components/ConsuldataFooter'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface FormData {
  email: string
  name: string
  cpf: string
  birth_date: string
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4')
}

function generatePassword(cpf: string, birthDate: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return ''
  const date = new Date(birthDate + 'T12:00:00')
  if (isNaN(date.getTime())) return ''

  // dd = day zero-padded
  const dd = String(date.getDate()).padStart(2, '0')
  // CPF group 2 = digits 3-5 (XXX.YYY.ZZZ-WW)
  const cpfGroup2 = digits.slice(3, 6)
  // Year last 2 digits reversed: 1976 → "76" → "67"
  const yearStr = String(date.getFullYear())
  const yearLast2 = yearStr.slice(-2)
  const yearReversed = yearLast2.split('').reverse().join('')

  return `${dd}${cpfGroup2}${yearReversed}`
}

function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(digits[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(digits[10])
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({ email: '', name: '', cpf: '', birth_date: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)

  function handleCPF(value: string) {
    setForm(prev => ({ ...prev, cpf: formatCPF(value) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validations
    if (!form.email.endsWith('@consuldata.com.br')) {
      setError('O e-mail deve ser do domínio @consuldata.com.br.')
      return
    }
    if (form.name.trim().split(' ').length < 2) {
      setError('Informe seu nome completo (nome e sobrenome).')
      return
    }
    if (!validateCPF(form.cpf)) {
      setError('CPF inválido. Verifique e tente novamente.')
      return
    }
    if (!form.birth_date) {
      setError('Informe sua data de nascimento.')
      return
    }

    const password = generatePassword(form.cpf, form.birth_date)
    if (!password || password.length < 5) {
      setError('Não foi possível gerar a senha. Verifique os dados.')
      return
    }

    setLoading(true)

    const res = await fetch('/api/register-driver', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        birth_date: form.birth_date,
        password,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao realizar cadastro. Fale com o administrador.')
      setLoading(false)
      return
    }

    setGeneratedPassword(password)
    setLoading(false)
  }

  function copyPassword() {
    navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // SUCCESS SCREEN
  if (generatedPassword) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#ebeff2' }}>
        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid #22c55e' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#555555' }}>
              CADASTRO REALIZADO
            </h1>
            <p style={{ color: '#8d949a', fontSize: 13, marginTop: 4 }}>
              Bem-vindo(a), {form.name.split(' ')[0]}!
            </p>
          </div>

          <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
            <p style={{ fontSize: 13, color: '#8d949a', marginBottom: 16, lineHeight: 1.6 }}>
              Sua senha de acesso foi gerada. <strong style={{ color: '#f86924' }}>Anote agora</strong> — você vai precisar dela toda vez que entrar.
            </p>

            {/* Password display */}
            <div className="rounded-xl p-5 text-center mb-4"
              style={{ background: '#ebeff2', border: '2px solid rgba(248,105,36,0.4)' }}>
              <p style={{ fontSize: 11, color: '#8d949a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Sua senha
              </p>
              <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 42, fontWeight: 800, color: '#f86924', letterSpacing: 4 }}>
                {generatedPassword}
              </p>
            </div>

            <button onClick={copyPassword}
              style={{
                width: '100%', padding: 12, borderRadius: 10, marginBottom: 12,
                background: copied ? 'rgba(34,197,94,0.1)' : '#dddddd',
                border: `1px solid ${copied ? '#22c55e' : '#b6bcc2'}`,
                color: copied ? '#22c55e' : '#e8eaf0', fontSize: 13,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}>
              {copied ? '✓ Copiado!' : '📋 Copiar senha'}
            </button>

            {/* Login info summary */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(33,39,113,0.04)', border: '1px solid rgba(33,39,113,0.08)' }}>
              <p style={{ fontSize: 12, color: '#555555', lineHeight: 1.7 }}>
                <strong style={{ color: '#f86924' }}>E-mail:</strong> {form.email}<br />
                <strong style={{ color: '#f86924' }}>Senha:</strong> {generatedPassword}<br />
                <strong style={{ color: '#8d949a', fontSize: 11 }}>Guarde estas informações.</strong>
              </p>
            </div>

            <button
              onClick={() => router.push('/login')}
              style={{
                width: '100%', marginTop: 16, padding: 14, borderRadius: 10,
                background: '#f86924', color: 'white', fontWeight: 700,
                fontSize: 15, border: 'none', cursor: 'pointer',
              }}>
              IR PARA O LOGIN →
            </button>
          </div>
        </div>
        <ConsuldataFooter />
    </main>
    )
  }

  // REGISTER FORM
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#ebeff2' }}>
      <div className="w-full max-w-sm animate-fade-up">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, color: '#555555' }}>
            FLEET<span style={{ color: '#f86924' }}>CHECK</span>
          </h1>
          <p style={{ color: '#8d949a', fontSize: 13, marginTop: 2 }}>Primeiro acesso — Motorista</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: '#ffffff', border: '1px solid #1a2040' }}>
          <p style={{ color: '#8d949a', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
            Preencha seus dados. Sua senha será gerada automaticamente.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8d949a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                E-mail Consuldata
              </label>
              <input type="email" value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="seu.nome@consuldata.com.br" required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#f86924'}
                onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8d949a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Nome completo
              </label>
              <input type="text" value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="João da Silva" required
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none' }}
                onFocus={e => e.target.style.borderColor = '#f86924'}
                onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>

            {/* CPF */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8d949a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                CPF
              </label>
              <input type="text" inputMode="numeric" value={form.cpf}
                onChange={e => handleCPF(e.target.value)}
                placeholder="000.000.000-00" required maxLength={14}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 16, outline: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 2 }}
                onFocus={e => e.target.style.borderColor = '#f86924'}
                onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>

            {/* Birth date */}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#8d949a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Data de nascimento
              </label>
              <input type="date" value={form.birth_date}
                onChange={e => setForm(prev => ({ ...prev, birth_date: e.target.value }))}
                required max={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: '#ebeff2', border: '1px solid #1a2040', color: '#555555', fontSize: 14, outline: 'none', colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#f86924'}
                onBlur={e => e.target.style.borderColor = '#dddddd'} />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: 14, borderRadius: 10, marginTop: 4,
                background: loading ? '#212771' : '#f86924',
                color: 'white', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer', minHeight: 48,
              }}>
              {loading ? 'Cadastrando...' : 'GERAR MINHA SENHA'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={() => router.push('/login')}
              style={{ background: 'none', border: 'none', color: '#8d949a', fontSize: 13, cursor: 'pointer' }}>
              Já tenho cadastro → Entrar
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
