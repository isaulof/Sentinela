import { describe, expect, it } from 'vitest'
import { celulaCsv, colunasDoCsv, nomeDoArquivo, nomeDoRelatorio, registrosParaCsv, registrosParaGeoJson } from './exportar'
import type { PlanoSalvo, Talhao } from './entidades'
import type { Registro } from './registro'

const talhao: Talhao = { id: 'T-01', nome: 'T-01 Mirante', anel: [[-55.92, -13.05], [-55.91, -13.05], [-55.91, -13.06], [-55.92, -13.06]], cultivar: 'Precoce', dataPlantio: '2026-09-08', estadio: 'R3', finalidade: 'graos', criadoEm: '2026-11-01T00:00:00Z' }
const plano: PlanoSalvo = { talhaoId: 'T-01', params: { method: 'zigzag', bufferM: 30, targetPoints: 2 }, pontos: [{ id: 'P01', order: 1, position: [-55.915, -13.052] }, { id: 'P02', order: 2, position: [-55.914, -13.053] }], caminho: [], areaHa: 84.2, geradoEm: '2026-11-01T00:00:00Z' }
const reg = (o: Partial<Registro> = {}): Registro => ({
  id: 'r1', talhaoId: 'T-01', amostrador: 'Ana', criadoEm: '2026-11-12T01:30:00Z', estadio: 'R5', finalidade: 'graos', pontoId: 'P01', posicao: [-55.915, -13.052],
  posicaoSimulada: false, precisaoM: 6.5, alvo: 'percevejo', fase: 'Adulto', quantidade: 3, zero: false, fotoIds: ['f'], observacao: '', ...o,
})
const linhas = (csv: string) => csv.replace('\uFEFF', '').trim().split('\r\n')

describe('CSV', () => {
  it('abre no Excel em português: BOM, ponto e vírgula e vírgula decimal', () => {
    const csv = registrosParaCsv([reg()], talhao, plano)
    expect(csv.startsWith('\uFEFF')).toBe(true)
    const [cab, l1] = linhas(csv)
    expect(cab!.split(';')).toEqual(colunasDoCsv())
    expect(l1!.split(';')).toHaveLength(colunasDoCsv().length)
    expect(l1).toContain(';6,5;') // precisão com vírgula decimal
  })
  it('data e hora são as locais, não as UTC (21:30 em Cuiabá continua no mesmo dia)', () => {
    const [cab, l1] = linhas(registrosParaCsv([reg({ fusoHorario: 'America/Cuiaba' })], talhao, plano)).map((l) => l.split(';'))
    const col = (n: string) => l1![cab!.indexOf(n)]
    expect(col('data_local')).toBe('2026-11-11')
    expect(col('hora_local')).toBe('21:30')
    expect(col('criado_em_utc')).toBe('2026-11-12T01:30:00Z')
    expect(col('ponto_ordem')).toBe('1')
    expect(col('alvo')).toBe('Percevejo-marrom')
  })
  it('inclui todas as versões, com o estado de cada uma', () => {
    const v1 = reg({ id: 'a', substituidoPorId: 'b' })
    const v2 = reg({ id: 'b', versao: 2, corrigeId: 'a', corrigidoPor: 'Ana', motivoCorrecao: 'recontagem', corrigidoEm: '2026-11-12T02:00:00Z' })
    const desfeito = reg({ id: 'c', pontoId: 'P02', anuladoEm: '2026-11-12T02:10:00Z', anuladoPor: 'Ana', motivoAnulacao: 'Desfeito logo após salvar' })
    const [cab, ...ls] = linhas(registrosParaCsv([v2, desfeito, v1], talhao, plano)).map((l) => l.split(';'))
    const estado = (i: number) => ls[i]![cab!.indexOf('estado')]
    expect(ls).toHaveLength(3)
    expect([estado(0), estado(1), estado(2)].sort()).toEqual(['ativa', 'anulada', 'corrigida'].sort())
    expect(ls.find((l) => l[0] === 'b')![cab!.indexOf('motivo_correcao')]).toBe('recontagem')
  })
  it('protege texto com ; aspas e quebra de linha, e neutraliza fórmulas', () => {
    expect(celulaCsv('a;b')).toBe('"a;b"')
    expect(celulaCsv('disse "oi"')).toBe('"disse ""oi"""')
    expect(celulaCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"')
    expect(celulaCsv('=SOMA(A1)')).toBe("'=SOMA(A1)")
    expect(celulaCsv('-5 plantas')).toBe("'-5 plantas")
    expect(celulaCsv(true)).toBe('sim')
    expect(celulaCsv(false)).toBe('não')
    expect(celulaCsv(undefined)).toBe('')
    expect(celulaCsv(1.5)).toBe('1,5')
    expect(celulaCsv(Number.NaN)).toBe('')
  })
  it('uma observação com quebra de linha mantém as colunas alinhadas', () => {
    const csv = registrosParaCsv([reg({ observacao: 'manchas;\ncom "pontos"' })], talhao, plano)
    expect(csv).toContain('"manchas;\ncom ""pontos"""')
  })
  it('sem registros devolve só o cabeçalho', () => {
    expect(linhas(registrosParaCsv([], talhao, plano))).toHaveLength(1)
  })
})

describe('GeoJSON', () => {
  const g = registrosParaGeoJson([reg(), reg({ id: 'r2', pontoId: 'P02', posicao: [-55.914, -13.053] })], talhao, plano, new Date('2026-11-11T17:00:00Z'))
  it('traz o contorno fechado e um ponto por registro, com [lon, lat]', () => {
    expect(g.type).toBe('FeatureCollection')
    expect(g.features).toHaveLength(3)
    const contorno = g.features[0]!
    expect(contorno.properties).toMatchObject({ tipo: 'talhao', nome: 'T-01 Mirante', area_ha: 84.2 })
    const anel = (contorno.geometry as { coordinates: number[][][] }).coordinates[0]!
    expect(anel[0]).toEqual(anel[anel.length - 1]) // polígono fechado
    expect(g.features[1]!.geometry).toEqual({ type: 'Point', coordinates: [-55.915, -13.052] })
  })
  it('as propriedades têm os mesmos nomes e valores do CSV', () => {
    const p = g.features[1]!.properties
    expect(Object.keys(p).filter((k) => k !== 'tipo')).toEqual(colunasDoCsv().filter((k) => k !== 'lon' && k !== 'lat'))
    expect(p).toMatchObject({ alvo: 'Percevejo-marrom', quantidade: 3, ponto_ordem: 1, coletado_por: 'Ana', estado: 'ativa' })
  })
})

describe('nome do arquivo', () => {
  it('sem acento nem espaço e com a data local', () => {
    expect(nomeDoArquivo({ ...talhao, nome: 'T-01 Mirante São José' }, new Date('2026-11-12T01:30:00Z'), 'csv')).toBe('sentinela_t-01-mirante-sao-jose_2026-11-11.csv')
    expect(nomeDoArquivo({ ...talhao, nome: '???' }, new Date('2026-11-11T17:00:00Z'), 'geojson')).toBe('sentinela_talhao_2026-11-11.geojson')
  })
})

describe('nome do PDF do relatório', () => {
  it('começa com Relatorio_, sem extensão, e usa a data local', () => {
    expect(nomeDoRelatorio({ ...talhao, nome: 'T-01 Mirante São José' }, new Date('2026-11-12T01:30:00Z'))).toBe('Relatorio_t-01-mirante-sao-jose_2026-11-11')
  })
})
