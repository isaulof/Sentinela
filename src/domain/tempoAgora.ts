/**
 * Clima de agora para a tela inicial (Open-Meteo, gratuita e sem chave): condição atual, mínima, máxima e chuva do dia.
 * Funções puras: a tela só pede a consulta e desenha o resultado. É um apoio de leitura rápida; o risco de doenças
 * continua sendo o da tela de Alertas.
 */
export interface AgoraNoLocal { em: string; temperaturaC: number; sensacaoC: number | null; umidadePct: number; chuvaMm: number; ventoKmh: number | null; codigo: number; ehDia: boolean }
export interface PrevisaoDoDia { dia: string; minC: number; maxC: number; chuvaMm: number; probChuvaPct: number | null; codigo: number }
export interface TempoAgora { agora: AgoraNoLocal; dias: PrevisaoDoDia[] }

export type IconeTempo = 'sol' | 'lua' | 'nuvemsol' | 'nuvemlua' | 'nuvem' | 'neblina' | 'garoa' | 'chuva' | 'raio'

/** Código de tempo da OMM (WMO) em português, com o ícone certo para dia ou noite. */
export function descreverTempo(codigo: number, ehDia: boolean): { texto: string; icone: IconeTempo } {
  const céu = (s: string, d: IconeTempo, n: IconeTempo) => ({ texto: s, icone: ehDia ? d : n })
  if (codigo === 0) return céu(ehDia ? 'Céu limpo' : 'Noite limpa', 'sol', 'lua')
  if (codigo === 1) return céu('Poucas nuvens', 'nuvemsol', 'nuvemlua')
  if (codigo === 2) return céu('Parcialmente nublado', 'nuvemsol', 'nuvemlua')
  if (codigo === 3) return { texto: 'Nublado', icone: 'nuvem' }
  if (codigo === 45 || codigo === 48) return { texto: 'Neblina', icone: 'neblina' }
  if (codigo >= 51 && codigo <= 57) return { texto: 'Garoa', icone: 'garoa' }
  if (codigo === 61 || codigo === 80) return { texto: codigo === 80 ? 'Pancadas fracas de chuva' : 'Chuva fraca', icone: 'chuva' }
  if (codigo === 63 || codigo === 81 || codigo === 66 || codigo === 67) return { texto: codigo === 81 ? 'Pancadas de chuva' : 'Chuva', icone: 'chuva' }
  if (codigo === 65 || codigo === 82) return { texto: codigo === 82 ? 'Pancadas fortes de chuva' : 'Chuva forte', icone: 'chuva' }
  if (codigo === 95) return { texto: 'Trovoada', icone: 'raio' }
  if (codigo === 96 || codigo === 99) return { texto: 'Trovoada com granizo', icone: 'raio' }
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return { texto: 'Frio com neve', icone: 'nuvem' }
  return { texto: 'Tempo indefinido', icone: 'nuvem' }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const lista = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null)

/** Lê a resposta da Open-Meteo. Formato inesperado ou sem os campos essenciais é erro (a tela mostra "indisponível"). */
export function parseTempoAgora(json: unknown): TempoAgora {
  const c = (json as { current?: Record<string, unknown> } | null)?.current
  const d = (json as { daily?: Record<string, unknown> } | null)?.daily
  if (!c || typeof c !== 'object' || !d || typeof d !== 'object') throw new Error('Resposta do clima em formato inesperado.')
  const t = num(c['temperature_2m'])
  const u = num(c['relative_humidity_2m'])
  const cod = num(c['weather_code'])
  if (t === null || u === null || cod === null || typeof c['time'] !== 'string') throw new Error('Resposta do clima sem os dados principais.')
  const tempos = lista(d['time']); const mx = lista(d['temperature_2m_max']); const mn = lista(d['temperature_2m_min']); const ch = lista(d['precipitation_sum']); const pr = lista(d['precipitation_probability_max']); const cd = lista(d['weather_code'])
  if (!tempos || !mx || !mn || !ch || !cd) throw new Error('Resposta do clima sem a previsão do dia.')
  const dias: PrevisaoDoDia[] = []
  tempos.forEach((dia, i) => {
    const max = num(mx[i]); const min = num(mn[i]); const chuva = num(ch[i]); const codigo = num(cd[i])
    if (typeof dia === 'string' && max !== null && min !== null && chuva !== null && codigo !== null) dias.push({ dia, minC: min, maxC: max, chuvaMm: chuva, probChuvaPct: pr ? num(pr[i]) : null, codigo })
  })
  if (dias.length === 0) throw new Error('Resposta do clima sem a previsão do dia.')
  return { agora: { em: c['time'], temperaturaC: t, sensacaoC: num(c['apparent_temperature']), umidadePct: u, chuvaMm: num(c['precipitation']) ?? 0, ventoKmh: num(c['wind_speed_10m']), codigo: cod, ehDia: c['is_day'] !== 0 }, dias }
}

const arred = (n: number) => Math.round(n)
export const grau = (n: number): string => `${arred(n)}°`

/** "13 mm" / "0,6 mm": inteiro sem casas a partir de 1 mm, senão uma casa com vírgula. */
export const milimetros = (mm: number): string => (mm >= 1 ? `${arred(mm)} mm` : `${mm.toFixed(1).replace('.', ',')} mm`)

/** Quando vale destacar a chuva do dia: pelo menos 1 mm previsto ou 50% de chance. Senão, nada a dizer. */
export function chuvaDoDia(d: PrevisaoDoDia): { texto: string; relevante: boolean } {
  const relevante = d.chuvaMm >= 1 || (d.probChuvaPct ?? 0) >= 50
  const prob = d.probChuvaPct !== null ? ` · ${arred(d.probChuvaPct)}%` : ''
  return { texto: relevante ? `Chuva ${milimetros(d.chuvaMm)}${prob}` : 'Sem chuva prevista', relevante }
}
