import type { LngLat } from './geo'
import type { Pendencia, PlanoSalvo } from './entidades'
import { estadosDosPontos, type EstadoPonto } from './ponto'
import type { Registro } from './registro'
import { niveisNaData, resumirResultado, setorDoFoco, visitas } from './resultados'
import type { AlvoId } from '@/knowledge/alvos'

/** Retrato de um talhão na visita mais recente: o que o Início e a lista de talhões mostram. */
export interface Panorama {
  total: number
  coletados: number
  areaHa: number
  ultimaVisita: string | null
  /** Pontos próximos do nível de ação, acima dele ou com doença. */
  emAtencao: number
  pctComOcorrencia: number
  alvoDominante: AlvoId | null
  /** Onde os pontos em atenção se concentram ("sul", "nordeste", "centro"…). */
  setor: string | null
  pendenciasAbertas: number
  pontosComFoto: number
  estados: Map<string, EstadoPonto>
}

export function panorama(plano: PlanoSalvo | undefined, regs: readonly Registro[], pendencias: readonly Pendencia[], anel: readonly LngLat[]): Panorama {
  const ids = plano?.pontos.map((p) => p.id) ?? []
  const dias = visitas(regs)
  const ultima = dias[dias.length - 1] ?? null
  const abertas = pendencias.filter((p) => !p.resolvida)
  if (!plano || !ultima) {
    const estados = estadosDosPontos(ids, new Map(), pendencias)
    return { total: ids.length, coletados: 0, areaHa: plano?.areaHa ?? 0, ultimaVisita: null, emAtencao: 0, pctComOcorrencia: 0, alvoDominante: null, setor: null, pendenciasAbertas: abertas.length, pontosComFoto: 0, estados }
  }
  const resumo = resumirResultado(ids, regs, ultima)
  const niveis = niveisNaData(regs, ultima, null)
  const estados = estadosDosPontos(ids, niveis, pendencias)
  const foco = plano.pontos.filter((p) => resumo.pontosEmAtencao.includes(p.id)).map((p) => p.position)
  const comFoto = new Set([...regs.filter((r) => r.fotoIds.length > 0).map((r) => r.pontoId), ...pendencias.filter((p) => p.fotoIds.length > 0).map((p) => p.pontoId)])
  return {
    total: resumo.total,
    coletados: resumo.coletados,
    areaHa: plano.areaHa,
    ultimaVisita: ultima,
    emAtencao: resumo.pontosEmAtencao.length,
    pctComOcorrencia: resumo.pctComOcorrencia,
    alvoDominante: resumo.alvoDominante,
    setor: foco.length > 0 ? setorDoFoco(anel, foco) : null,
    pendenciasAbertas: abertas.length,
    pontosComFoto: ids.filter((id) => comFoto.has(id)).length,
    estados,
  }
}
