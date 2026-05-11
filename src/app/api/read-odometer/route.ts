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
              text: 'Esta é uma foto do hodômetro/painel de um veículo. Leia o valor de quilometragem (KM ou odômetro). Responda APENAS com o número inteiro, sem pontos, vírgulas, espaços ou texto adicional. Se não conseguir ler, responda com: 0',
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
