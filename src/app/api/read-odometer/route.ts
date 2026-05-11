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
              text: `Você é um especialista em leitura de hodômetros de veículos brasileiros.

Sua tarefa: encontrar e retornar APENAS o valor do HODÔMETRO TOTAL (quilometragem total acumulada do veículo).

REGRAS OBRIGATÓRIAS:
1. O hodômetro total tem geralmente 5 ou 6 dígitos (ex: 110846, 162984, 146528)
2. Costuma aparecer com o sufixo "km" ou "KM" próximo ao número
3. Pode aparecer com rótulos como "ODO", "KM TOTAL", ou simplesmente "km"

NÃO LEIA (ignore completamente):
- Velocidade atual: número grande no centro do painel (ex: 0, 60, 120)
- Hodômetro parcial/viagem: número pequeno com 3-4 dígitos (ex: 1324, 0.0, 45.2)
- Hora/relógio: formato HH:MM (ex: 13:30, 0:00)
- Temperatura: número pequeno com °C
- RPM: números no tacômetro

PADRÃO COMUM nos painéis brasileiros:
- Display vermelho (VW/Gol): hodômetro fica no display digital central, última linha, formato "XXXXXKM"
- Display laranja circular (Fiat Uno/Argo): hodômetro fica na parte inferior do display redondo, com sufixo "km"  
- Display azul digital (Chevrolet Onix): hodômetro fica à direita do display, abaixo do parcial, com sufixo "km"

Responda APENAS com o número inteiro do hodômetro total, sem pontos, vírgulas, espaços, letras ou qualquer outro caractere.
Se não conseguir identificar com certeza, responda: 0`,
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
