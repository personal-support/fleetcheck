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
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          {
            type: 'text',
            text: `Analise esta foto do painel de um veículo e encontre o valor do HODÔMETRO TOTAL.

O hodômetro total representa a quilometragem acumulada total desde a fábrica.

COMO IDENTIFICAR — o hodômetro total é sempre um número de 5 ou 6 dígitos próximo à palavra "km" ou "KM":

TIPO 1 — Display LED/LCD vermelho (ex: VW Gol):
- Número branco sobre fundo escuro vermelho
- Formato compacto, última linha do display
- Pode aparecer como "1 10846km" → leia como 110846

TIPO 2 — Display circular laranja (ex: Fiat Uno):
- Tela redonda laranja/âmbar
- Hodômetro na parte inferior do círculo
- Pode terminar com "C" ou outro caractere decorativo — ignore
- Exemplo: "162984C" → leia 162984

TIPO 3 — Display digital azul (ex: Chevrolet Onix antigo):
- Retângulo azul com dígitos brancos
- O hodômetro fica à DIREITA do "0" central (velocidade)
- Abaixo do parcial de viagem (número menor de 3-4 dígitos)
- Exemplo: linha de cima "1324", linha de baixo "146528km" → leia 146528

TIPO 4 — Display LCD colorido com texto (ex: Fiat Argo/Cronos):
- Tela retangular colorida no centro do painel
- Pode mostrar mensagens de texto acima (ex: "Acionar pedal embreagem")
- O hodômetro fica na parte INFERIOR da tela, formato "XXXXXKM" ou "XXXXX km"
- Pode ter zero à esquerda: "039878 km" → leia 39878
- Ignore completamente qualquer texto de mensagem/aviso acima

IGNORE COMPLETAMENTE:
- O número grande no velocímetro (velocidade atual, ex: 0, 60, 80)
- Hodômetro parcial/viagem (3-4 dígitos com decimais, ex: 134.5)
- Relógio digital (formato HH:MM, ex: 14:09)
- RPM (números no tacômetro à direita)
- Temperatura, nível de combustível

ATENÇÃO ESPECIAL AO DÍGITO 8:
Em displays LED/LCD com fundo escuro, o segmento central do "8" pode aparecer apagado.
Se um dígito parece "0" mas o contexto sugere "8", prefira "8".

Se houver mais de um número com "km", escolha o de MAIS dígitos.

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
