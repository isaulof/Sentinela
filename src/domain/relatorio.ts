import type { Confianca } from './funil'
import { ROTULO_CONFIANCA } from './funil'

export interface DadosRelatorio {
  fazenda?: string
  talhao?: string
  /** Número do ponto de coleta, quando o diagnóstico é de um ponto. */
  ponto?: number
  estadio?: string
  principal: { nome: string; cientifico?: string; confianca: Confianca; /** Índice de certeza (%), quando houver. */ percentual?: number }
  outras: string[]
  /** Respostas dadas, na ordem em que foram feitas. */
  respostas: { pergunta: string; resposta: string }[]
  passos: string[]
  /** Nomes dos problemas cujas fotos o produtor escolheu na comparação. */
  fotosEscolhidas?: string[]
  quando: Date
}

const dataBr = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

/**
 * Mensagem em texto simples para mandar ao agrônomo (WhatsApp, e-mail). Diz o que foi visto e a hipótese do app,
 * sem recomendar produto nem dose: a decisão de aplicar é do agrônomo.
 */
export function mensagemParaAgronomo(d: DadosRelatorio): string {
  const onde = [d.talhao, d.ponto !== undefined ? `ponto ${d.ponto}` : null, d.estadio ? `fase ${d.estadio}` : null].filter(Boolean).join(' · ')
  const linhas = [
    `Sentinela · pré-diagnóstico de campo (${dataBr(d.quando)})`,
    ...(d.fazenda ? [d.fazenda] : []),
    ...(onde ? [`Local: ${onde}`] : []),
    '',
    `Hipótese mais compatível: ${d.principal.nome}${d.principal.cientifico ? ` (${d.principal.cientifico})` : ''} · ${d.principal.percentual !== undefined ? `${d.principal.percentual}% de certeza, ` : ''}${ROTULO_CONFIANCA[d.principal.confianca].toLowerCase()}`,
    ...(d.outras.length ? [`Também possível: ${d.outras.join('; ')}`] : []),
    '',
    ...(d.fotosEscolhidas?.length ? [`Na comparação de fotos o produtor escolheu: ${d.fotosEscolhidas.join('; ')}`, ''] : []),
    'O que foi observado:',
    ...d.respostas.map((r) => `- ${r.pergunta} ${r.resposta}`),
    ...(d.passos.length ? ['', 'Próximos passos sugeridos pelo app:', ...d.passos.map((p, i) => `${i + 1}. ${p}`)] : []),
    '',
    'É uma pista de apoio, não um laudo. Peço a sua avaliação antes de qualquer decisão de aplicação.',
  ]
  return linhas.join('\n')
}
