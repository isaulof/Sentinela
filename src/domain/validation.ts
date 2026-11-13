import { ALVOS } from '@/knowledge/alvos'
import type { FonteId } from '@/knowledge/fontes'
import { avaliar, type Avaliacao } from './decision'
import { distanceToRingEdge, makeProjection, pointInRing, type LngLat } from './geo'
import { atingiu, isEstadio } from './phenology'
import type { Registro } from './registro'

export type Gravidade = 'erro' | 'aviso'
export interface Problema {
  regra: string
  gravidade: Gravidade
  campo: keyof Registro | 'foto'
  mensagem: string
  fonte?: FonteId
}

export interface ContextoValidacao {
  agora: Date
  /** Média histórica de `quantidade` para o mesmo alvo (>= 3 registros), se houver. */
  mediaHistorica?: number
  /** Anel do talhão, para a coerência espacial. */
  anelTalhao?: readonly LngLat[]
  /** Pontos do plano atual. */
  pontosDoPlano?: readonly string[]
}

export interface ResultadoValidacao {
  ok: boolean
  problemas: Problema[]
  avaliacao: Avaliacao
}

/** Fator sobre a média histórica a partir do qual o valor exige foto e dupla checagem. */
export const FATOR_OUTLIER = 5
export const MAX_POR_UNIDADE = 100
export const TOLERANCIA_GPS_M = 50
/** Atraso máximo aceito para o carimbo de hora em relação ao relógio (relógio do aparelho errado). */
export const TOLERANCIA_RELOGIO_MS = 5 * 60_000

/**
 * Regras de validação (Bloco 3.3). Cada regra tem um código estável (V01...), citado na tela
 * e no Projeto Técnico.
 */
export function validarRegistro(r: Registro, ctx: ContextoValidacao): ResultadoValidacao {
  const p: Problema[] = []
  const erro = (regra: string, campo: Problema['campo'], mensagem: string) => p.push({ regra, gravidade: 'erro', campo, mensagem })
  const aviso = (regra: string, campo: Problema['campo'], mensagem: string, fonte?: FonteId) =>
    p.push({ regra, gravidade: 'aviso', campo, mensagem, ...(fonte ? { fonte } : {}) })

  const alvo = ALVOS[r.alvo]
  const valido = isEstadio(r.estadio)

  // V01 georreferenciamento obrigatório
  if (!Number.isFinite(r.posicao?.[0]) || !Number.isFinite(r.posicao?.[1]) || Math.abs(r.posicao[1]) > 90 || Math.abs(r.posicao[0]) > 180) {
    erro('V01', 'posicao', 'Não é possível salvar sem coordenadas válidas.')
  }
  // V02 estádio fenológico válido
  if (!valido) erro('V02', 'estadio', 'Informe um estádio fenológico válido (VE, VC, V1 a V12, R1 a R8).')
  // V03 fase obrigatória e pertencente ao alvo
  if (!r.fase) erro('V03', 'fase', 'Informe a fase do alvo.')
  else if (!alvo.fases.includes(r.fase)) erro('V03', 'fase', `Fase "${r.fase}" não existe para ${alvo.nome}.`)
  // V04 limites numéricos
  if (!Number.isFinite(r.quantidade) || r.quantidade < 0) erro('V04', 'quantidade', 'A quantidade não pode ser negativa.')
  else if (r.quantidade > MAX_POR_UNIDADE) erro('V04', 'quantidade', `Máximo de ${MAX_POR_UNIDADE} por unidade de amostragem. Confira a contagem.`)
  for (const campo of ['severidadePct', 'desfolhaPct'] as const) {
    const v = r[campo]
    if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 100)) erro('V04', campo, 'O percentual deve estar entre 0 e 100.')
  }
  // V05 "zero" explícito: 0 só vale se o amostrador confirmou que nada foi encontrado
  const semNada = r.quantidade === 0 && !r.presente && (r.severidadePct ?? 0) === 0 && (r.desfolhaPct ?? 0) === 0
  if (semNada && !r.zero) erro('V05', 'zero', 'Para registrar ausência, confirme "Nenhuma ocorrência". O zero é um dado.')
  if (r.zero && !semNada) erro('V05', 'zero', 'Há medidas preenchidas. Desmarque "Nenhuma ocorrência" ou zere as medidas.')
  // V06 ponto do plano
  if (ctx.pontosDoPlano && !ctx.pontosDoPlano.includes(r.pontoId)) erro('V06', 'pontoId', `O ponto ${r.pontoId} não pertence ao plano de amostragem deste talhão.`)
  // V07 carimbo de data/hora
  const t = Date.parse(r.criadoEm)
  if (Number.isNaN(t)) erro('V07', 'criadoEm', 'Data e hora inválidas.')
  else if (t > ctx.agora.getTime() + TOLERANCIA_RELOGIO_MS) erro('V07', 'criadoEm', 'A data do registro está no futuro. Verifique o relógio do aparelho.')

  // Avaliação agronômica (somente com dados válidos)
  const avaliacao = valido
    ? avaliar({
        alvo: r.alvo,
        estadio: r.estadio,
        quantidade: Number.isFinite(r.quantidade) ? r.quantidade : 0,
        ...(r.presente !== undefined ? { presente: r.presente } : {}),
        ...(r.severidadePct !== undefined ? { severidadePct: r.severidadePct } : {}),
        ...(r.desfolhaPct !== undefined ? { desfolhaPct: r.desfolhaPct } : {}),
        finalidade: r.finalidade,
      })
    : avaliar({ alvo: r.alvo, estadio: 'R3', quantidade: 0 })

  // V08 estádio fora da janela do alvo
  if (valido && !atingiu(r.estadio, alvo.estadioMin)) {
    aviso('V08', 'estadio', `${alvo.nome} é avaliada a partir de ${alvo.estadioMin}. O registro fica salvo, sem decisão.`, alvo.fontes[0])
  }
  // V09 evidência fotográfica obrigatória quando há decisão em jogo
  const exigeFoto = avaliacao.nivel === 'atingido' || avaliacao.nivel === 'deteccao'
  if (exigeFoto && r.fotoIds.length === 0) erro('V09', 'foto', 'Foto de evidência obrigatória: este registro atingiu o nível de ação ou teve detecção (sem limite numérico, o agrônomo decide com a foto).')
  // V10 outlier em relação ao histórico: foto + dupla checagem
  if (ctx.mediaHistorica && ctx.mediaHistorica > 0 && r.quantidade > FATOR_OUTLIER * ctx.mediaHistorica) {
    const msg = `Valor ${FATOR_OUTLIER}x acima da média histórica (${ctx.mediaHistorica.toFixed(1)}). Exige foto e dupla checagem.`
    if (r.fotoIds.length === 0) erro('V10', 'foto', msg)
    else aviso('V10', 'quantidade', msg)
  }
  // V11 coerência espacial (apenas com GPS real)
  if (!r.posicaoSimulada && ctx.anelTalhao && ctx.anelTalhao.length >= 3 && valido && Number.isFinite(r.posicao[0])) {
    const proj = makeProjection(ctx.anelTalhao)
    const ring = ctx.anelTalhao.map(proj.toXY)
    const xy = proj.toXY(r.posicao)
    const fora = !pointInRing(xy, ring) && distanceToRingEdge(xy, ring) > TOLERANCIA_GPS_M
    if (fora) aviso('V11', 'posicao', `A posição está a mais de ${TOLERANCIA_GPS_M} m do talhão. Confirme se você está no talhão certo.`)
  }
  // V12 precisão do GPS
  if (!r.posicaoSimulada && r.precisaoM !== undefined && r.precisaoM > 15) {
    aviso('V12', 'precisaoM', `Precisão do GPS de ±${Math.round(r.precisaoM)} m. Para amostragem, espere melhorar ou aproxime-se do ponto.`)
  }

  return { ok: !p.some((x) => x.gravidade === 'erro'), problemas: p, avaliacao }
}

/** Média histórica por alvo; só vale com ao menos 3 registros não-zero. */
export function mediaHistorica(valores: readonly number[]): number | undefined {
  const v = valores.filter((x) => x > 0)
  return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : undefined
}
