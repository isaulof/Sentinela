import { ALVOS } from '@/knowledge/alvos'
import { avaliarRegistro } from './analise'
import type { PlanoSalvo, Talhao } from './entidades'
import { estadoDaVersao } from './ficha'
import type { Registro } from './registro'
import { PROTOCOLO_VERSAO } from './registro'
import { diaLocal, horaLocal } from './tempo'

/**
 * Exportação para avaliação: todos os campos do registro (inclusive versões substituídas e registros desfeitos, com
 * a coluna `estado`), nos mesmos números que aparecem na tela. Datas e horas são locais (fuso do registro) e também UTC.
 * CSV: separador ";" e vírgula decimal, com BOM UTF-8, para abrir direto no Excel em português.
 */

const SEP = ';'

type Linha = (string | number | boolean | null | undefined)[]

const COLUNAS: { nome: string; valor: (r: Registro, c: Contexto) => Linha[number] }[] = [
  { nome: 'id', valor: (r) => r.id },
  { nome: 'versao', valor: (r) => r.versao ?? 1 },
  { nome: 'estado', valor: (r) => estadoDaVersao(r) },
  { nome: 'talhao', valor: (_r, c) => c.talhao.nome },
  { nome: 'ponto_id', valor: (r) => r.pontoId },
  { nome: 'ponto_ordem', valor: (r, c) => c.ordem.get(r.pontoId) },
  { nome: 'alvo', valor: (r) => ALVOS[r.alvo].nome },
  { nome: 'fase', valor: (r) => r.fase },
  { nome: 'estadio', valor: (r) => r.estadio },
  { nome: 'quantidade', valor: (r) => r.quantidade },
  { nome: 'unidade', valor: (r) => ALVOS[r.alvo].coleta.unidade },
  { nome: 'sem_ocorrencia', valor: (r) => r.zero },
  { nome: 'presente', valor: (r) => r.presente },
  { nome: 'severidade_pct', valor: (r) => r.severidadePct },
  { nome: 'desfolha_pct', valor: (r) => r.desfolhaPct },
  { nome: 'nivel', valor: (r) => avaliarRegistro(r).nivel },
  { nome: 'decisao', valor: (r) => avaliarRegistro(r).titulo },
  { nome: 'data_local', valor: (r) => diaLocal(r.criadoEm, r.fusoHorario) },
  { nome: 'hora_local', valor: (r) => horaLocal(r.criadoEm, r.fusoHorario) },
  { nome: 'fuso', valor: (r) => r.fusoHorario },
  { nome: 'criado_em_utc', valor: (r) => r.criadoEm },
  { nome: 'inicio_utc', valor: (r) => r.inicioEm },
  { nome: 'fim_utc', valor: (r) => r.fimEm },
  { nome: 'metodo', valor: (r) => r.metodo },
  { nome: 'protocolo_versao', valor: (r) => r.protocoloVersao },
  { nome: 'repeticoes', valor: (r) => r.repeticoes },
  { nome: 'area_amostrada', valor: (r) => r.areaAmostrada },
  { nome: 'parte_da_planta', valor: (r) => r.parteDaPlanta },
  { nome: 'tempo', valor: (r) => r.condicoes?.tempo },
  { nome: 'vento', valor: (r) => r.condicoes?.vento },
  { nome: 'folha_molhada', valor: (r) => r.condicoes?.folhaMolhada },
  { nome: 'coletado_por', valor: (r) => r.amostrador },
  { nome: 'responsavel_tecnico', valor: (r) => r.responsavel },
  { nome: 'revisado_por', valor: (r) => r.revisadoPor },
  { nome: 'lon', valor: (r) => r.posicao[0] },
  { nome: 'lat', valor: (r) => r.posicao[1] },
  { nome: 'lon_planejada', valor: (r) => r.posicaoPlanejada?.[0] },
  { nome: 'lat_planejada', valor: (r) => r.posicaoPlanejada?.[1] },
  { nome: 'distancia_do_ponto_m', valor: (r) => r.distanciaDoPontoM },
  { nome: 'precisao_gps_m', valor: (r) => r.precisaoM },
  { nome: 'posicao_simulada', valor: (r) => r.posicaoSimulada },
  { nome: 'fotos', valor: (r) => r.fotoIds.length },
  { nome: 'observacao', valor: (r) => r.observacao },
  { nome: 'corrige_id', valor: (r) => r.corrigeId },
  { nome: 'corrigido_por', valor: (r) => r.corrigidoPor },
  { nome: 'corrigido_em_utc', valor: (r) => r.corrigidoEm },
  { nome: 'motivo_correcao', valor: (r) => r.motivoCorrecao },
  { nome: 'anulado_por', valor: (r) => r.anuladoPor },
  { nome: 'anulado_em_utc', valor: (r) => r.anuladoEm },
  { nome: 'motivo_anulacao', valor: (r) => r.motivoAnulacao },
]

interface Contexto { talhao: Talhao; ordem: ReadonlyMap<string, number> }

const contexto = (talhao: Talhao, plano: PlanoSalvo | undefined): Contexto => ({ talhao, ordem: new Map((plano?.pontos ?? []).map((p) => [p.id, p.order])) })

/** Uma célula do CSV: vazio, booleano em português, número com vírgula, texto entre aspas quando necessário. */
export function celulaCsv(v: Linha[number]): string {
  if (v === undefined || v === null) return ''
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : ''
  // Texto que começaria como fórmula (=, +, -, @) é neutralizado: planilhas executariam isso.
  const t = /^[=+\-@]/.test(v) ? `'${v}` : v
  return /[";\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export const colunasDoCsv = (): string[] => COLUNAS.map((c) => c.nome)

/** CSV de todos os registros do talhão (todas as versões), em ordem de data e de versão. */
export function registrosParaCsv(regs: readonly Registro[], talhao: Talhao, plano: PlanoSalvo | undefined): string {
  const c = contexto(talhao, plano)
  const ordenados = [...regs].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || (a.pontoId).localeCompare(b.pontoId) || (a.versao ?? 1) - (b.versao ?? 1))
  const linhas = [colunasDoCsv().join(SEP), ...ordenados.map((r) => COLUNAS.map((col) => celulaCsv(col.valor(r, c))).join(SEP))]
  return `\uFEFF${linhas.join('\r\n')}\r\n`
}

export interface GeoJsonFeature { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] } | { type: 'Polygon'; coordinates: [number, number][][] }; properties: Record<string, unknown> }
export interface GeoJsonColecao { type: 'FeatureCollection'; features: GeoJsonFeature[] }

/** GeoJSON: o contorno do talhão e um ponto por registro, com todas as propriedades (mesmos nomes das colunas do CSV). */
export function registrosParaGeoJson(regs: readonly Registro[], talhao: Talhao, plano: PlanoSalvo | undefined, geradoEm: Date): GeoJsonColecao {
  const c = contexto(talhao, plano)
  const anel: [number, number][] = talhao.anel.map((p) => [p[0], p[1]])
  const fechado = anel.length > 0 && (anel[0]![0] !== anel[anel.length - 1]![0] || anel[0]![1] !== anel[anel.length - 1]![1]) ? [...anel, anel[0]!] : anel
  const contorno: GeoJsonFeature = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [fechado] }, properties: { tipo: 'talhao', nome: talhao.nome, cultivar: talhao.cultivar, plantio: talhao.dataPlantio, area_ha: plano?.areaHa ?? null, protocolo_versao: PROTOCOLO_VERSAO, gerado_em_utc: geradoEm.toISOString() } }
  const pontos = [...regs]
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || a.pontoId.localeCompare(b.pontoId) || (a.versao ?? 1) - (b.versao ?? 1))
    .map((r): GeoJsonFeature => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [r.posicao[0], r.posicao[1]] },
      properties: { tipo: 'registro', ...Object.fromEntries(COLUNAS.filter((col) => col.nome !== 'lon' && col.nome !== 'lat').map((col) => [col.nome, col.valor(r, c) ?? null])) },
    }))
  return { type: 'FeatureCollection', features: [contorno, ...pontos] }
}

/** Nome do PDF do relatório, sem extensão (o navegador usa o título da página): "Relatorio_t-01-mirante_2026-11-12". */
export function nomeDoRelatorio(talhao: Talhao, agora: Date, fuso?: string): string {
  return nomeDoArquivo(talhao, agora, 'csv', fuso).replace(/^sentinela_/, 'Relatorio_').replace(/\.csv$/, '')
}

/** Nome de arquivo seguro: "sentinela_t-01-mirante_2026-11-11.csv". */
export function nomeDoArquivo(talhao: Talhao, agora: Date, extensao: 'csv' | 'geojson', fuso?: string): string {
  const slug = talhao.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'talhao'
  return `sentinela_${slug}_${diaLocal(agora, fuso)}.${extensao}`
}
