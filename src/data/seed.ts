import type { LngLat } from '@/domain/geo'
import type { OrdemChecagem, PlanoSalvo, Talhao } from '@/domain/entidades'
import { generatePlan, recommendedPointCount, DEFAULT_BUFFER_M, type SamplingMethod } from '@/domain/sampling'
import { camposV2, type Registro } from '@/domain/registro'
import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import { db } from './db'
import { comprimirImagem, salvarFotoBruta } from './fotos'

/**
 * Dados de demonstração da Fazenda Santa Aurora (fictícia, em Lucas do Rio Verde - MT).
 * Servem para apresentar o app em sala, sem ir a campo. Tudo é marcado como demonstração.
 */
const ORIGEM: LngLat = [-55.805, -13.255]
const kx = 111_320 * Math.cos((ORIGEM[1] * Math.PI) / 180)
const m2ll = (pts: [number, number][]): LngLat[] => pts.map(([x, y]) => [ORIGEM[0] + x / kx, ORIGEM[1] + y / 110_574] as LngLat)

interface Def { id: string; nome: string; cultivar: string; plantio: string; estadio: string; metodo: SamplingMethod; anel: LngLat[] }

const DEFS: Def[] = [
  { id: 'T-01', nome: 'T-01 Mirante', cultivar: 'Cultivar precoce', plantio: '2026-09-08', estadio: 'R3', metodo: 'zigzag',
    anel: m2ll([[0, 40], [860, 0], [900, 980], [40, 1000]]) },
  { id: 'T-02', nome: 'T-02 Baixada', cultivar: 'Cultivar média', plantio: '2026-09-12', estadio: 'R2', metodo: 'zigzag',
    anel: m2ll([[1000, 0], [1650, 60], [1700, 780], [1250, 850], [1020, 600]]) },
  { id: 'T-03', nome: 'T-03 Estrada', cultivar: 'Cultivar média', plantio: '2026-09-25', estadio: 'V8', metodo: 'zigzag',
    anel: m2ll([[0, 1100], [900, 1100], [900, 1500], [500, 1500], [500, 1900], [0, 1900]]) },
  { id: 'T-04', nome: 'T-04 Cabeceira', cultivar: 'Cultivar tardia', plantio: '2026-10-05', estadio: 'V5', metodo: 'diagonais',
    anel: m2ll([[1000, 1000], [1500, 1000], [1500, 1700], [1000, 1650]]) },
]

const dia = (agora: Date, d: number, hora = 9): string => {
  const x = new Date(agora)
  x.setUTCDate(x.getUTCDate() - d)
  x.setUTCHours(hora + 4, 0, 0, 0) // Mato Grosso é UTC-4: 09h local = 13h UTC
  return x.toISOString()
}

function fotoDemo(titulo: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#2f4a38"/><circle cx="320" cy="210" r="90" fill="#6fae7f" opacity=".6"/><text x="320" y="330" fill="#eaf5ef" font-family="sans-serif" font-size="26" text-anchor="middle">${titulo}</text><text x="320" y="370" fill="#bcd6c4" font-family="sans-serif" font-size="18" text-anchor="middle">Imagem de demonstração</text></svg>`
  return new Blob([svg], { type: 'image/svg+xml' })
}

/** Foto de referência (já presente no app, em public/imagens/diagnostico) de cada problema que a demonstração registra. */
export const FOTOS_REAIS_DA_DEMO: Readonly<Record<string, string>> = {
  'Percevejo-marrom': 'percevejo.jpg',
  'Lagarta-falsa-medideira': 'lagarta.jpg',
  'Ferrugem-asiática': 'ferrugem.jpg',
  'Mancha-alvo': 'manchaalvo.jpg',
}

export interface FotoPronta { blob: Blob; largura: number; altura: number }
export type BuscarFoto = (arquivo: string) => Promise<FotoPronta>

/** Lê a foto real da própria aplicação (mesma origem: funciona offline depois da primeira visita) e a reduz como as fotos da câmera. */
export const buscarFotoReal: BuscarFoto = async (arquivo) => {
  const r = await fetch(`./imagens/diagnostico/${arquivo}`)
  if (!r.ok) throw new Error(`Foto ${arquivo}: HTTP ${r.status}`)
  return comprimirImagem(await r.blob())
}

/**
 * Carrega a demonstração. As fotos dos pontos são fotos reais; se alguma não puder ser lida (por exemplo, primeira visita
 * sem internet), aquele ponto usa a ilustração desenhada, e a demonstração carrega do mesmo jeito.
 */
export async function carregarDemonstracao(agora = new Date(), buscarFoto: BuscarFoto = buscarFotoReal): Promise<void> {
  // As fotos são preparadas ANTES da transação: esperar rede ou canvas dentro dela faria o banco encerrá-la antes da hora.
  const reais = new Map<string, FotoPronta>()
  for (const [titulo, arquivo] of Object.entries(FOTOS_REAIS_DA_DEMO)) {
    try { reais.set(titulo, await buscarFoto(arquivo)) } catch { /* sem a foto real: vale a ilustração */ }
  }

  await db.transaction('rw', [db.talhoes, db.planos, db.registros, db.ordens, db.fotos], async () => {
    const talhoes: Talhao[] = []
    const planos: PlanoSalvo[] = []
    const regs: Registro[] = []
    const foto = new Map<string, string>()

    // Carregar de novo troca os registros da demonstração (mesmos ids): as fotos da carga anterior não podem ficar órfãs ocupando espaço.
    const antigos = await db.registros.where('id').startsWith('DEMO-').toArray()
    await db.fotos.bulkDelete(antigos.flatMap((r) => r.fotoIds))

    const nova = async (titulo: string, base: string): Promise<string> => {
      const real = reais.get(base)
      const id = real ? await salvarFotoBruta(real.blob, real.largura, real.altura) : await salvarFotoBruta(fotoDemo(titulo), 640, 480)
      foto.set(titulo, id)
      return id
    }

    for (const d of DEFS) {
      const t: Talhao = { id: d.id, nome: d.nome, anel: d.anel, cultivar: d.cultivar, dataPlantio: d.plantio, estadio: d.estadio, finalidade: 'graos', criadoEm: agora.toISOString() }
      talhoes.push(t)
      const params = { method: d.metodo, bufferM: DEFAULT_BUFFER_M, targetPoints: 0 }
      const area = generatePlan(d.anel, { ...params, targetPoints: 10 }).areaHa
      const plano = generatePlan(d.anel, { ...params, targetPoints: recommendedPointCount(area) })
      planos.push({ talhaoId: d.id, params: plano.params, pontos: plano.points, caminho: plano.paths, areaHa: plano.areaHa, geradoEm: agora.toISOString() })
    }

    type Campos = Partial<Registro> & { alvo: AlvoId; fase: string; quantidade: number }
    const add = async (talhaoId: string, ponto: { id: string; position: LngLat }, d: number, estadio: string, c: Campos, fotoTitulo?: string) => {
      const semNada = c.quantidade === 0 && !c.presente && !c.desfolhaPct && !c.severidadePct
      regs.push({
        id: `DEMO-${talhaoId}-${c.alvo}-${ponto.id}-${d}`, talhaoId, amostrador: 'Demonstração', criadoEm: dia(agora, d), estadio, finalidade: 'graos',
        pontoId: ponto.id, posicao: ponto.position, posicaoSimulada: true, zero: semNada, ...camposV2({ posicao: ponto.position }, { metodo: ALVOS[c.alvo].coleta.metodo, parteDaPlanta: ALVOS[c.alvo].coleta.parte, planejada: ponto.position, inicio: new Date(dia(agora, d)), fim: new Date(dia(agora, d)), responsavel: 'Prof. responsável (demonstração)' }), fotoIds: fotoTitulo ? [await nova(`${fotoTitulo} · ${talhaoId} ${ponto.id}`, fotoTitulo)] : [],
        observacao: '', ...c,
      })
    }

    // T-01 (R3): percevejo com foco; rodada anterior (R2) sem decisão
    const p1 = planos[0]!.pontos
    for (const [i, p] of p1.entries()) {
      const q = Math.round(Math.max(0, 4.2 - Math.abs(i - 5) * 1.4))
      await add('T-01', p, 1, 'R3', { alvo: 'percevejo', fase: 'Adulto', quantidade: q }, q >= 2 ? 'Percevejo-marrom' : undefined)
      await add('T-01', p, 8, 'R2', { alvo: 'percevejo', fase: 'Adulto', quantidade: i % 4 === 0 ? 1 : 0 })
    }
    // T-02 (R2): lagarta com foco + ferrugem detectada em um ponto
    const p2 = planos[1]!.pontos
    for (const [i, p] of p2.entries()) {
      const q = Math.round(Math.max(0, 26 - Math.abs(i - 3) * 6))
      const desf = Math.round(Math.max(2, 20 - Math.abs(i - 3) * 4))
      await add('T-02', p, 2, 'R2', { alvo: 'lagarta', fase: 'Lagarta grande (maior que 1,5 cm)', quantidade: q, desfolhaPct: desf }, q >= 20 || desf >= 15 ? 'Lagarta-falsa-medideira' : undefined)
      const ferr = i === 7
      await add('T-02', p, 1, 'R2', { alvo: 'ferrugem', fase: 'Urédias abertas', quantidade: 0, ...(ferr ? { presente: true, severidadePct: 3 } : {}) }, ferr ? 'Ferrugem-asiática' : undefined)
    }
    // T-03 (V8): mancha-alvo baixa, 6 primeiros pontos
    for (const p of planos[2]!.pontos.slice(0, 6)) {
      await add('T-03', p, 3, 'V8', { alvo: 'manchaAlvo', fase: 'Lesões iniciais', quantidade: 0, presente: true, severidadePct: 2 }, 'Mancha-alvo')
    }

    const ordens: OrdemChecagem[] = [
      { id: 'ORD-demo-1', talhaoId: 'T-02', pontoId: p2[3]!.id, origem: 'drone', criadaEm: dia(agora, 0, 7), status: 'aberta',
        motivo: 'NDRE 0,31 (38% abaixo do talhão), anomalia de 2.100 m² próxima ao ponto ' + p2[3]!.id + '.' },
      { id: 'ORD-demo-0', talhaoId: 'T-01', pontoId: p1[8]!.id, origem: 'drone', criadaEm: dia(agora, 4, 7), status: 'falso_positivo', resolvidaEm: dia(agora, 4, 12),
        causa: 'Compactação na faixa de tráfego de máquinas; sem sinais de doença.', motivo: 'NDRE baixo em faixa estreita (comparar com operações).' },
    ]

    await db.talhoes.bulkPut(talhoes)
    await db.planos.bulkPut(planos)
    await db.registros.bulkPut(regs)
    await db.ordens.bulkPut(ordens)
  })
}

export const idsDemonstracao = DEFS.map((d) => d.id)
