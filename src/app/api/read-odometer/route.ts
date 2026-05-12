import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Map vehicle models to display type hints
function getDisplayHint(vehicleModel: string): string {
  const model = vehicleModel.toLowerCase()

  if (model.includes('gol') || model.includes('fox') || model.includes('voyage') || model.includes('saveiro')) {
    return `ESTE VEÍCULO É UM VW (Gol/Fox/Voyage):
Display LED vermelho compacto. O hodômetro total fica na última linha, com prefixo "1" antes dos dígitos em alguns modelos.
Exemplo: "1 10846km" → leia como 110846. Ignore o relógio (HH:MM) e o parcial (número curto com decimal).`
  }

  if (model.includes('uno') || model.includes('palio') || model.includes('siena') || model.includes('strada')) {
    return `ESTE VEÍCULO É UM FIAT ANTIGO (Uno/Palio/Siena):
Display circular laranja/âmbar. O hodômetro fica na parte inferior do círculo.
Pode terminar com letra decorativa ("C", "F") — ignore. Exemplo: "162984C" → leia 162984.`
  }

  if (model.includes('argo') || model.includes('cronos') || model.includes('mobi') || model.includes('toro')) {
    return `ESTE VEÍCULO É UM FIAT MODERNO (Argo/Cronos/Mobi):
Display LCD colorido retangular no centro. Pode mostrar mensagens de texto ACIMA do hodômetro — ignore completamente essas mensagens.
O hodômetro fica na parte INFERIOR, formato "XXXXX km". Pode ter zero à esquerda: "039878 km" → leia 39878.`
  }

  if (model.includes('onix') || model.includes('cobalt') || model.includes('classic') || model.includes('agile') || model.includes('spin') || model.includes('tracker') || model.includes('montana')) {
    return `ESTE VEÍCULO É UM CHEVROLET/GM (Onix/Montana/Cobalt/Classic):
Display LCD azul retangular. Estrutura do display (de cima para baixo):
  1. Hodômetro PARCIAL de viagem: número curto (3-4 dígitos com decimal, ex: "536.1") — IGNORE
  2. Hodômetro TOTAL: número de 5-6 dígitos seguido de "km" (ex: "093821 km") — ESTE É O CORRETO
  3. Relógio: formato HH:MM (ex: "15:09") — IGNORE
ATENÇÃO CRÍTICA: o "1" ou dígito que aparece no FINAL da linha do parcial NÃO faz parte do hodômetro total.
Exemplo correto: parcial "536.1" + total "09382 1 km" → leia apenas 93821 (ignore o "1" solto após o número).`
  }

  // Generic fallback
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const { image, vehicleModel } = await request.json()
    if (!image) return NextResponse.json({ km: null, error: 'No image' }, { status: 400 })

    const modelHint = vehicleModel ? getDisplayHint(vehicleModel) : ''

    const specificInstruction = modelHint
      ? `\n\n⚡ INSTRUÇÃO ESPECÍFICA PARA ESTE VEÍCULO:\n${modelHint}\n`
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          {
            type: 'text',
            text: `Analise esta foto do painel de um veículo e encontre o valor do HODÔMETRO TOTAL.${specificInstruction}

O hodômetro total é a quilometragem acumulada total desde a fábrica — sempre um número de 5 ou 6 dígitos próximo à palavra "km".

REGRAS GERAIS:
- IGNORE: velocidade (número grande central), parcial/trip (3-4 dígitos com decimal), relógio (HH:MM), RPM, temperatura
- Se houver mais de um número com "km", escolha o de MAIS dígitos
- Dígito 8 em displays LED pode parecer 0 — prefira 8 se o contexto sugerir
- Zero à esquerda: "039878 km" → leia 39878

Responda SOMENTE com os dígitos do hodômetro total, sem nenhum outro caractere.
Se não conseguir identificar com certeza, responda: 0`,
          },
        ],
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '0'
    const km = parseInt(text.replace(/\D/g, '')) || 0
    return NextResponse.json({ km })
  } catch (err) {
    console.error('OCR error:', err)
    return NextResponse.json({ km: null, error: 'OCR failed' }, { status: 500 })
  }
}
