import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import type { Nivel } from './decision'
import { haversineM, makeProjection, pointInRing, type LngLat } from './geo'
import { SINAL_FRACO_M } from './navegacao'
import type { Registro } from './registro'
import { amostrasNaData, ateODia, LIMITE_ACAO, valorDoRegistro, type Amostra, type CelulaCalor } from './resultados'
import { dataBr, diaLocal } from './tempo'

/**
 * Análise do mapa inteligente. Cada indicador traz a conta e o limite, para o professor conseguir auditar.
 * Nada aqui é modelo epidemiológico: são indicadores de apoio para priorizar inspeção em campo.
 */

// ───────────── Calor honesto ─────────────

/** Abaixo disso não se desenha calor: com 1 ou 2 pontos a "estimativa" seria só um palpite pintado no talhão todo. */
export const MIN_AMOSTRAS_CALOR = 3
/** Raio de influência = este fator × a distância média ao vizinho mais próximo. Fora dele a célula fica "sem dado". */
export const FATOR_RAIO = 1.5

/** Distância média (m) de cada ponto ao seu vizinho mais próximo. Nulo com menos de 2 pontos. */
export function distanciaVizinhoMediaM(posicoes: readonly LngLat[]): number | null {
  if (posicoes.length < 2) return null
  let soma = 0
  for (const [i, a] of posicoes.entries()) {
    let menor = Infinity
    for (const [j, b] of posicoes.entries()) if (i !== j) menor = Math.min(menor, haversineM(a, b))
    soma += menor
  }
  return soma / posicoes.length
}

export const raioDeInfluenciaM = (posicoes: readonly LngLat[]): number | null => {
  const d = distanciaVizinhoMediaM(posicoes)
  return d === null ? null : d * FATOR_RAIO
}

export interface CalorHonesto {
  celulas: CelulaCalor[]
  /** Células dentro do talhão mais longe que o raio de qualquer ponto: sem dado, desenhadas hachuradas. */
  semDado: CelulaCalor[]
  max: number
  raioM: number | null
  /** % do talhão que fica dentro do raio de algum ponto. */
  coberturaPct: number
  /** Por que não há calor (poucos pontos); nulo quando há. */
  motivo: string | null
}

/**
 * Estimativa por IDW (potência 2) usando só os pontos dentro do raio de influência de cada célula.
 * Com menos de 3 pontos não calcula. Células fora do alcance de qualquer ponto viram "sem dado", nunca um valor inventado.
 */
export function calorHonesto(anel: readonly LngLat[], amostras: readonly Amostra[], nx = 64, ny = 56): CalorHonesto {
  const n = amostras.length
  if (n < MIN_AMOSTRAS_CALOR) {
    return { celulas: [], semDado: [], max: 0, raioM: null, coberturaPct: 0, motivo: n === 0 ? 'Ainda não há leituras deste alvo.' : `Só ${n} ${n === 1 ? 'ponto tem' : 'pontos têm'} leitura. São precisos pelo menos ${MIN_AMOSTRAS_CALOR} para estimar o calor; veja os valores nos pontos.` }
  }
  const raioM = raioDeInfluenciaM(amostras.map((a) => a.posicao))!
  const proj = makeProjection(anel)
  const ring = anel.map(proj.toXY)
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const pts = amostras.map((a) => ({ xy: proj.toXY(a.posicao), v: a.valor }))
  const w = (x1 - x0) / nx
  const h = (y1 - y0) / ny
  const celulas: CelulaCalor[] = []
  const semDado: CelulaCalor[] = []
  let max = 0
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * w
      const y = y1 - (j + 0.5) * h
      if (!pointInRing([x, y], ring)) continue
      const xa = x0 + i * w
      const yb = y1 - j * h
      const anelCelula = [proj.toLngLat([xa, yb]), proj.toLngLat([xa + w, yb]), proj.toLngLat([xa + w, yb - h]), proj.toLngLat([xa, yb - h])]
      let num = 0
      let den = 0
      let exato: number | null = null
      let dentro = 0
      for (const p of pts) {
        const d2 = (p.xy[0] - x) ** 2 + (p.xy[1] - y) ** 2
        if (d2 > raioM * raioM) continue
        dentro++
        if (d2 < 1) { exato = p.v; break }
        num += p.v / d2
        den += 1 / d2
      }
      if (dentro === 0) { semDado.push({ anel: anelCelula, valor: 0 }); continue }
      const v = exato ?? num / den
      max = Math.max(max, v)
      celulas.push({ anel: anelCelula, valor: v })
    }
  }
  const total = celulas.length + semDado.length
  return { celulas, semDado, max, raioM, coberturaPct: total ? Math.round((celulas.length / total) * 100) : 0, motivo: null }
}

// ───────────── Escala fixa e rótulos ─────────────

const PASSOS_BONITOS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100]
/** Arredonda para cima até um valor "redondo" para a escala (1, 2, 5, 10, 20…), para o fim da escala ser legível. */
export function tetoRedondo(v: number): number {
  const x = Math.max(1, v)
  if (x > 100) return Math.ceil(x / 50) * 50
  return PASSOS_BONITOS.find((p) => p >= x) ?? 100
}

export interface EscalaCalor { teto: number; limite: number | null; maximoObservado: number }

/**
 * Escala do calor do alvo, igual em todas as visitas: vai de 0 até o maior valor já registrado no talhão (ou o nível de ação,
 * se maior), arredondado. Assim duas visitas ficam comparáveis a olho. A escala só muda quando surge um valor maior.
 */
export function escalaDoAlvo(regs: readonly Registro[], alvo: AlvoId): EscalaCalor {
  const maximoObservado = regs.filter((r) => r.alvo === alvo).reduce((m, r) => Math.max(m, valorDoRegistro(r)), 0)
  const limite = LIMITE_ACAO[alvo] ?? null
  return { teto: tetoRedondo(Math.max(maximoObservado, limite ?? 0)), limite, maximoObservado }
}

/** "4", "4,5": inteiro sem casas, senão uma casa com vírgula. */
export const rotuloValor = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ','))

// ───────────── Mudança entre visitas ─────────────

export type Mudanca = 'piorou' | 'melhorou' | 'igual' | 'novo' | 'sem_leitura'
export interface DiferencaPonto { pontoId: string; antes: number | null; agora: number; delta: number | null; mudanca: Mudanca }

const ultimaAte = (regs: readonly Registro[], dia: string, alvo: AlvoId): Map<string, Registro> => {
  const m = new Map<string, Registro>()
  for (const r of ateODia(regs, dia).filter((x) => x.alvo === alvo).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))) m.set(r.pontoId, r)
  return m
}

/**
 * Para cada ponto com leitura até `dia`, o que mudou em relação a `diaAnterior`:
 * piorou/melhorou/igual quando houve nova leitura; "novo" se não havia leitura antes; "sem_leitura" se o ponto não foi revisitado
 * (não é o mesmo que "igual": o app não sabe se mudou).
 */
export function diferencaEntreVisitas(regs: readonly Registro[], dia: string, diaAnterior: string, alvo: AlvoId): DiferencaPonto[] {
  const agora = ultimaAte(regs, dia, alvo)
  const antes = ultimaAte(regs, diaAnterior, alvo)
  return [...agora.entries()].map(([pontoId, r]) => {
    const a = antes.get(pontoId)
    const v = valorDoRegistro(r)
    if (!a) return { pontoId, antes: null, agora: v, delta: null, mudanca: 'novo' as const }
    if (a.id === r.id) return { pontoId, antes: valorDoRegistro(a), agora: v, delta: null, mudanca: 'sem_leitura' as const }
    const antesV = valorDoRegistro(a)
    const delta = v - antesV
    return { pontoId, antes: antesV, agora: v, delta, mudanca: delta > 1e-9 ? 'piorou' as const : delta < -1e-9 ? 'melhorou' as const : 'igual' as const }
  })
}

// ───────────── Qualidade dos dados ─────────────

/** Ponto registrado a mais que isto do ponto planejado (com GPS real) é sinalizado. */
export const LIMIAR_LONGE_DO_PONTO_M = 25
/** Critério próprio (parecido com o V10 da validação): valor muito acima do que os outros pontos mostram. */
export const FATOR_ATIPICO = 3
export const MIN_PONTOS_ATIPICO = 4

export type TipoAlerta = 'sem_registro' | 'visita_incompleta' | 'gps_impreciso' | 'longe_do_ponto' | 'valor_atipico' | 'posicao_simulada'
export interface AlertaQualidade { tipo: TipoAlerta; gravidade: 'aviso' | 'info'; mensagem: string; pontos: string[] }

const lista = (ids: string[], ordem: ReadonlyMap<string, number>) => ids.map((id) => ordem.get(id) ?? id).sort((a, b) => Number(a) - Number(b)).join(', ')

export function qualidadeDosDados(
  plano: { pontos: readonly { id: string; order: number; position: LngLat }[] },
  regs: readonly Registro[],
  dia: string,
): AlertaQualidade[] {
  const ate = ateODia(regs, dia)
  const ordem = new Map(plano.pontos.map((p) => [p.id, p.order]))
  const plan = new Map(plano.pontos.map((p) => [p.id, p.position]))
  const alertas: AlertaQualidade[] = []
  const rot = (n: number, um: string, varios: string) => (n === 1 ? um : varios)

  const comRegistro = new Set(ate.map((r) => r.pontoId))
  const sem = plano.pontos.filter((p) => !comRegistro.has(p.id)).map((p) => p.id)
  if (sem.length) alertas.push({ tipo: 'sem_registro', gravidade: 'aviso', mensagem: `${sem.length} ${rot(sem.length, 'ponto sem nenhum registro', 'pontos sem nenhum registro')} (${lista(sem, ordem)}). O mapa não diz nada sobre ${rot(sem.length, 'ele', 'eles')}.`, pontos: sem })

  const doDia = new Set(regs.filter((r) => diaLocal(r.criadoEm, r.fusoHorario) === dia).map((r) => r.pontoId))
  if (doDia.size > 0 && doDia.size < plano.pontos.length) alertas.push({ tipo: 'visita_incompleta', gravidade: 'info', mensagem: `A visita de ${dataBr(dia)} cobriu ${doDia.size} de ${plano.pontos.length} pontos.`, pontos: plano.pontos.filter((p) => !doDia.has(p.id)).map((p) => p.id) })

  const reais = ate.filter((r) => !r.posicaoSimulada)
  const impreciso = [...new Set(reais.filter((r) => (r.precisaoM ?? 0) > SINAL_FRACO_M).map((r) => r.pontoId))]
  if (impreciso.length) alertas.push({ tipo: 'gps_impreciso', gravidade: 'aviso', mensagem: `GPS impreciso (pior que ±${SINAL_FRACO_M} m) em ${impreciso.length} ${rot(impreciso.length, 'ponto', 'pontos')}: ${lista(impreciso, ordem)}.`, pontos: impreciso })

  const longe = [...new Set(reais.filter((r) => {
    const d = r.distanciaDoPontoM ?? (plan.has(r.pontoId) ? haversineM(r.posicao, plan.get(r.pontoId)!) : 0)
    return d > LIMIAR_LONGE_DO_PONTO_M
  }).map((r) => r.pontoId))]
  if (longe.length) alertas.push({ tipo: 'longe_do_ponto', gravidade: 'aviso', mensagem: `Registro feito a mais de ${LIMIAR_LONGE_DO_PONTO_M} m do ponto planejado em ${longe.length} ${rot(longe.length, 'ponto', 'pontos')}: ${lista(longe, ordem)}.`, pontos: longe })

  const atipicos = new Set<string>()
  for (const alvo of Object.keys(ALVOS) as AlvoId[]) {
    const am = amostrasNaData(regs, dia, alvo)
    if (am.length < MIN_PONTOS_ATIPICO) continue
    for (const a of am) {
      const outros = am.filter((x) => x.id !== a.id).map((x) => x.valor)
      const media = outros.reduce((s, v) => s + v, 0) / outros.length
      if (media > 0 && a.valor > FATOR_ATIPICO * media) atipicos.add(a.id)
    }
  }
  if (atipicos.size) alertas.push({ tipo: 'valor_atipico', gravidade: 'aviso', mensagem: `Valor muito acima dos demais (mais de ${FATOR_ATIPICO}× a média dos outros pontos) em ${atipicos.size} ${rot(atipicos.size, 'ponto', 'pontos')}: ${lista([...atipicos], ordem)}. Confira a contagem e a foto.`, pontos: [...atipicos] })

  const simulados = ate.filter((r) => r.posicaoSimulada)
  if (simulados.length) alertas.push({ tipo: 'posicao_simulada', gravidade: 'info', mensagem: `${simulados.length} ${rot(simulados.length, 'registro com posição simulada', 'registros com posição simulada')} (demonstração): a posição é a planejada, não a do GPS.`, pontos: [...new Set(simulados.map((r) => r.pontoId))] })
  return alertas
}

// ───────────── Foco espacial (índice de Moran) ─────────────

export const MIN_PONTOS_MORAN = 8
export type ClasseEspacial = 'agrupado' | 'aleatorio' | 'disperso' | 'indeterminado'
export interface Moran {
  classe: ClasseEspacial
  /** Índice de Moran I: perto de +1 = valores parecidos ficam juntos (foco); perto de 0 = ao acaso; negativo = alternados. */
  I: number | null
  esperado: number | null
  z: number | null
  /** p bilateral, sob normalidade. */
  p: number | null
  n: number
  raioM: number | null
  vizinhosMedios: number | null
  texto: string
}

/** Função de distribuição da normal padrão (Abramowitz-Stegun 7.1.26 para o erf). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2
}

/**
 * Autocorrelação espacial global (Moran I) com vizinhança binária: dois pontos são vizinhos se estão a menos que o raio de influência.
 * Variância sob suposição de normalidade. É um indicador, não prova: com poucos pontos ele é instável (exige 8).
 */
export function moranI(amostras: readonly Amostra[]): Moran {
  const n = amostras.length
  const base = { I: null, esperado: null, z: null, p: null, n, raioM: null, vizinhosMedios: null }
  if (n < MIN_PONTOS_MORAN) return { ...base, classe: 'indeterminado', texto: `Só ${n} ${n === 1 ? 'ponto' : 'pontos'}: o teste de foco precisa de pelo menos ${MIN_PONTOS_MORAN}.` }
  const raioM = raioDeInfluenciaM(amostras.map((a) => a.posicao))!
  const x = amostras.map((a) => a.valor)
  const media = x.reduce((s, v) => s + v, 0) / n
  const dev = x.map((v) => v - media)
  const denom = dev.reduce((s, d) => s + d * d, 0)
  if (denom === 0) return { ...base, raioM, classe: 'indeterminado', texto: 'Todos os pontos têm o mesmo valor: não há variação para analisar.' }
  let S0 = 0
  let soma = 0
  const k = new Array<number>(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j || haversineM(amostras[i]!.posicao, amostras[j]!.posicao) > raioM) continue
      S0++
      k[i]!++
      soma += dev[i]! * dev[j]!
    }
  }
  if (S0 === 0) return { ...base, raioM, classe: 'indeterminado', texto: 'Nenhum ponto tem vizinho dentro do raio de influência.' }
  const I = (n / S0) * (soma / denom)
  const E = -1 / (n - 1)
  const S1 = 2 * S0
  const S2 = 4 * k.reduce((s, v) => s + v * v, 0)
  const varI = (n * n * S1 - n * S2 + 3 * S0 * S0) / ((n * n - 1) * S0 * S0) - E * E
  const z = varI > 0 ? (I - E) / Math.sqrt(varI) : 0
  const p = 2 * (1 - normalCdf(Math.abs(z)))
  const classe: ClasseEspacial = z > 1.96 ? 'agrupado' : z < -1.96 ? 'disperso' : 'aleatorio'
  const vizinhosMedios = S0 / n
  const num = (v: number) => v.toFixed(2).replace('.', ',')
  const texto = classe === 'agrupado' ? `Os valores parecidos ficam juntos (I = ${num(I)}, z = ${num(z)}): indício de foco, não de distribuição ao acaso.`
    : classe === 'disperso' ? `Os valores se alternam entre pontos vizinhos (I = ${num(I)}, z = ${num(z)}): sem foco; padrão mais espalhado que o acaso.`
      : `Sem padrão espacial claro (I = ${num(I)}, z = ${num(z)}): a diferença entre os pontos pode ser acaso.`
  return { classe, I, esperado: E, z, p, n, raioM, vizinhosMedios, texto }
}

// ───────────── Tendência e distribuição ─────────────

export type RumoTendencia = 'subindo' | 'estavel' | 'caindo' | 'insuficiente'
export interface Tendencia { rumo: RumoTendencia; de: number | null; para: number | null; variacaoPct: number | null; texto: string }

/** Variação da média entre as duas últimas visitas. Dentro de ±10% (da média anterior, no mínimo 1) conta como estável. */
export function tendencia(serie: readonly { dia: string; media: number }[]): Tendencia {
  if (serie.length < 2) return { rumo: 'insuficiente', de: null, para: null, variacaoPct: null, texto: 'Com uma só visita ainda não dá para ver a tendência.' }
  const a = serie[serie.length - 2]!
  const b = serie[serie.length - 1]!
  const variacao = (b.media - a.media) / Math.max(a.media, 1)
  const rumo: RumoTendencia = variacao > 0.1 ? 'subindo' : variacao < -0.1 ? 'caindo' : 'estavel'
  const pct = Math.round(variacao * 100)
  const verbo = rumo === 'subindo' ? 'Subindo' : rumo === 'caindo' ? 'Caindo' : 'Estável'
  return { rumo, de: a.media, para: b.media, variacaoPct: pct, texto: `${verbo}: média de ${rotuloValor(Math.round(a.media * 10) / 10)} em ${dataBr(a.dia)} para ${rotuloValor(Math.round(b.media * 10) / 10)} em ${dataBr(b.dia)}.` }
}

export const ROTULO_NIVEL: Record<Nivel | 'sem_leitura', string> = {
  sem_leitura: 'Sem leitura', nao_aplicavel: 'Fora da janela', ausente: 'Sem ocorrência', abaixo: 'Abaixo do nível', proximo: 'Perto do nível', atingido: 'Nível atingido', deteccao: 'Doença detectada',
}
const ORDEM_NIVEL: (Nivel | 'sem_leitura')[] = ['ausente', 'abaixo', 'proximo', 'atingido', 'deteccao', 'nao_aplicavel', 'sem_leitura']

export function distribuicaoPorNivel(pontosIds: readonly string[], niveis: ReadonlyMap<string, Nivel>): { nivel: Nivel | 'sem_leitura'; rotulo: string; n: number }[] {
  const cont = new Map<Nivel | 'sem_leitura', number>()
  for (const id of pontosIds) { const n = niveis.get(id) ?? 'sem_leitura'; cont.set(n, (cont.get(n) ?? 0) + 1) }
  return ORDEM_NIVEL.filter((n) => cont.get(n)).map((nivel) => ({ nivel, rotulo: ROTULO_NIVEL[nivel], n: cont.get(nivel)! }))
}

// ───────────── Tabela ponto × visita ─────────────

export interface LinhaMatriz { pontoId: string; ordem: number; valores: (number | null)[] }

/** Valor lido em cada ponto, visita a visita (a última leitura daquele dia; vazio se o ponto não foi visitado no dia). */
export function matrizPontoVisita(plano: { pontos: readonly { id: string; order: number }[] }, regs: readonly Registro[], alvo: AlvoId, dias: readonly string[]): LinhaMatriz[] {
  const porDia = dias.map((d) => {
    const m = new Map<string, Registro>()
    for (const r of regs.filter((x) => x.alvo === alvo && diaLocal(x.criadoEm, x.fusoHorario) === d).sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))) m.set(r.pontoId, r)
    return m
  })
  return [...plano.pontos].sort((a, b) => a.order - b.order).map((p) => ({ pontoId: p.id, ordem: p.order, valores: porDia.map((m) => { const r = m.get(p.id); return r ? valorDoRegistro(r) : null }) }))
}
