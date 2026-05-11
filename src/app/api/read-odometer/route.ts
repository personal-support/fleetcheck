import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()
    if (!image) return NextResponse.json({ km: null, error: 'No image' }, { status: 400 })

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: `Analise esta foto do painel de um veículo e encontre o valor do hodômetro total.

O hodômetro total é o número que representa a quilometragem acumulada total do veículo desde que saiu de fábrica.

Como identificar o hodômetro total visualmente:
- É um número de 5 ou 6 dígitos (entre 10000 e 999999)
- Está acompanhado da palavra "km" ou "KM" logo após ou abaixo
- Fica em um display digital (LCD ou LED) — pode ser vermelho, laranja, azul ou branco
- Geralmente fica na parte inferior ou central do painel de instrumentos

O que NÃO é o hodômetro — ignore completamente:
- O número grande no centro (é a velocidade atual, geralmente 0 quando parado)
- Números curtos de 3-4 dígitos com casas decimais (ex: 134.5 — é o hodômetro parcial/trip)
- Formato HH:MM como 13:30 ou 0:00 (é o relógio)
- Números pequenos no mostrador circular (são RPM ou temperatura)

Se houver mais de um número com "km", escolha o de MAIS dígitos — esse é o total.

Responda SOMENTE com os dígitos do hodômetro total, sem nenhum outro caractere.
Se não conseguir ler com segurança, responda apenas: 0`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '0'
    const km = parseInt(text.replace(/\D/g, '')) || 0
    return NextResponse.json({ km })
  } catch (err) {
    console.error('OCR error:', err)
    return NextResponse.json({ km: null, error: 'OCR failed' }, { status: 500 })
  }
}
