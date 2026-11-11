/**
 * Datas e horas do app, sempre no fuso da fazenda (padrão America/Cuiaba, UTC-4, sem horário de verão).
 *
 * Os registros guardam o instante em ISO 8601 UTC. O "dia" de uma visita, porém, é o dia LOCAL da
 * fazenda: um registro às 21:30 em Cuiabá é 01:30 UTC do dia seguinte e não pode virar outra visita.
 * Toda conta por dia passa por aqui; nada deve fatiar `criadoEm.slice(0, 10)`.
 */
export const FUSO_PADRAO = 'America/Cuiaba'

const MS_DIA = 86_400_000

const formatadores = new Map<string, Intl.DateTimeFormat>()
function partes(instante: number, fuso: string): Record<string, string> {
  let f = formatadores.get(fuso)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    formatadores.set(fuso, f)
  }
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(instante)) o[p.type] = p.value
  return o
}

const paraMs = (v: string | number | Date): number => (typeof v === 'string' ? Date.parse(v) : v instanceof Date ? v.getTime() : v)

/** Dia local (yyyy-mm-dd) de um instante. Instante inválido devolve texto vazio. */
export function diaLocal(v: string | number | Date, fuso: string = FUSO_PADRAO): string {
  const t = paraMs(v)
  if (!Number.isFinite(t)) return ''
  const p = partes(t, fuso)
  return `${p.year}-${p.month}-${p.day}`
}

/** Hora local (hh:mm) de um instante. */
export function horaLocal(v: string | number | Date, fuso: string = FUSO_PADRAO): string {
  const t = paraMs(v)
  if (!Number.isFinite(t)) return ''
  const p = partes(t, fuso)
  return `${p.hour}:${p.minute}`
}

/** Desvio do fuso em ms naquele instante (positivo a leste de UTC). */
function desvioMs(t: number, fuso: string): number {
  const p = partes(t, fuso)
  const comoUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second))
  return comoUtc - Math.floor(t / 1000) * 1000
}

/** Último instante (23:59:59.999 local) do dia yyyy-mm-dd no fuso. */
export function fimDoDia(dia: string, fuso: string = FUSO_PADRAO): Date {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number]
  const naoDeslocado = Date.UTC(a, m - 1, d + 1, 0, 0, 0) - 1
  return new Date(naoDeslocado - desvioMs(naoDeslocado, fuso))
}

/** Soma (ou subtrai) dias a uma data yyyy-mm-dd, sem passar por fuso. */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(a, m - 1, d) + n * MS_DIA).toISOString().slice(0, 10)
}

/** 'yyyy-mm-dd' → 'dd/mm/aaaa'. */
export const dataBr = (dia: string): string => (dia ? `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}` : '')

/** Instante → '11/11/2026 13:24' (data completa e hora local). */
export function dataHoraBr(v: string | number | Date, fuso: string = FUSO_PADRAO): string {
  const d = diaLocal(v, fuso)
  return d ? `${dataBr(d)} ${horaLocal(v, fuso)}` : ''
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

/** 'yyyy-mm-dd' → 'quarta-feira, 11 de novembro de 2026'. */
export function dataPorExtenso(dia: string): string {
  if (!dia) return ''
  const [a, m, d] = dia.split('-').map(Number) as [number, number, number]
  const sem = SEMANA[new Date(Date.UTC(a, m - 1, d)).getUTCDay()]!
  return `${sem}, ${d} de ${MESES[m - 1]!} de ${a}`
}

/** Saudação pela hora local. */
export function saudacao(v: string | number | Date, fuso: string = FUSO_PADRAO): string {
  const h = Number(horaLocal(v, fuso).slice(0, 2))
  return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

/** Safra no formato 25/26. A safra de soja começa em setembro. */
export function safraAtual(dia: string | Date, fuso: string = FUSO_PADRAO): string {
  const [a, m] = diaLocal(dia, fuso).split('-').map(Number) as [number, number]
  const ini = m >= 9 ? a : a - 1
  return `${String(ini).slice(2)}/${String(ini + 1).slice(2)}`
}
