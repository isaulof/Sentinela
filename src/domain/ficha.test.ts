import { describe, expect, it } from 'vitest'
import { condicoesDoRegistro, duracaoDoRegistro, estadoDaVersao, linhaDoTempoDoPonto, medidaDoRegistro, posicaoDoRegistro, rastroDaVersao, resumoDoRegistro } from './ficha'
import type { Registro } from './registro'

const reg = (o: Partial<Registro> = {}): Registro => ({
  id: 'r', talhaoId: 'T', amostrador: 'Ana', criadoEm: '2026-11-11T17:24:00Z', estadio: 'R5', finalidade: 'graos', pontoId: 'P01', posicao: [-55.9, -13.05],
  posicaoSimulada: false, alvo: 'percevejo', fase: 'Adulto', quantidade: 4, zero: false, fotoIds: [], observacao: '', ...o,
})

describe('redação da ficha', () => {
  it('medida: contagem, zero, doença e desfolha', () => {
    expect(medidaDoRegistro(reg())).toBe('4 por metro')
    expect(medidaDoRegistro(reg({ quantidade: 0, zero: true }))).toBe('nenhuma ocorrência')
    expect(medidaDoRegistro(reg({ alvo: 'ferrugem', quantidade: 0, presente: true, severidadePct: 3 }))).toBe('presente · 3%')
    expect(medidaDoRegistro(reg({ alvo: 'lagarta', quantidade: 6, desfolhaPct: 12 }))).toBe('6 por metro · desfolha 12%')
  })
  it('resumo usa data e hora locais e o nível da decisão', () => {
    const t = resumoDoRegistro(reg({ quantidade: 4 }))
    expect(t).toContain('Percevejo-marrom · 4 por metro · 11/11/2026 13:24')
    expect(t).toMatch(/nível de ação|Nível de ação/i)
  })
  it('posição: GPS com precisão e distância, ou simulada', () => {
    expect(posicaoDoRegistro(reg({ precisaoM: 6.4, distanciaDoPontoM: 3.2 }))).toBe('GPS ±6 m · a 3 m do ponto')
    expect(posicaoDoRegistro(reg({ posicaoSimulada: true }))).toBe('Posição simulada (demonstração)')
    expect(posicaoDoRegistro(reg())).toBe('GPS')
  })
  it('condições e duração só aparecem quando informadas', () => {
    expect(condicoesDoRegistro(reg())).toBeNull()
    expect(condicoesDoRegistro(reg({ condicoes: { tempo: 'nublado', vento: 'calmo', folhaMolhada: true } }))).toBe('nublado · vento calmo · folha molhada')
    expect(duracaoDoRegistro(reg())).toBeNull()
    expect(duracaoDoRegistro(reg({ inicioEm: '2026-11-11T17:20:00Z', fimEm: '2026-11-11T17:24:00Z' }))).toBe('4 min')
    expect(duracaoDoRegistro(reg({ inicioEm: '2026-11-11T17:24:00Z', fimEm: '2026-11-11T17:24:20Z' }))).toBe('menos de 1 min')
  })
})

describe('versões e rastro', () => {
  it('estado da versão e texto de auditoria', () => {
    expect(estadoDaVersao(reg())).toBe('ativa')
    expect(estadoDaVersao(reg({ substituidoPorId: 'x' }))).toBe('corrigida')
    expect(estadoDaVersao(reg({ anuladoEm: '2026-11-11T17:30:00Z' }))).toBe('anulada')
    expect(rastroDaVersao(reg())).toBeNull()
    expect(rastroDaVersao(reg({ corrigidoEm: '2026-11-11T17:40:00Z', corrigidoPor: 'Ana', motivoCorrecao: 'recontagem' }))).toBe('Corrigido por Ana em 11/11/2026 13:40: recontagem')
    expect(rastroDaVersao(reg({ anuladoEm: '2026-11-11T17:30:00Z', anuladoPor: 'Ana', motivoAnulacao: 'Desfeito logo após salvar' }))).toBe('Desfeito por Ana em 11/11/2026 13:30: Desfeito logo após salvar')
  })
  it('linha do tempo junta registros e achados, do mais recente ao mais antigo', () => {
    const l = linhaDoTempoDoPonto(
      [reg({ id: 'a', criadoEm: '2026-11-10T13:00:00Z' }), reg({ id: 'b', criadoEm: '2026-11-11T13:00:00Z' })],
      [{ id: 'p', talhaoId: 'T', pontoId: 'P01', fotoIds: [], nota: '', estadio: 'R5', amostrador: 'Ana', criadoEm: '2026-11-10T20:00:00Z' }],
    )
    expect(l.map((e) => e.registro?.id ?? e.pendencia?.id)).toEqual(['b', 'p', 'a'])
  })
})

describe('descreverAmostra', () => {
  it('pano de batida para praga, folhas para doença', async () => {
    const { descreverAmostra } = await import('./registro')
    expect(descreverAmostra('praga', 1)).toBe('1 batida de 1 m')
    expect(descreverAmostra('praga', 5)).toBe('5 batidas de 1 m')
    expect(descreverAmostra('doenca', 1)).toBe('1 folha inspecionada')
    expect(descreverAmostra('doenca', 10)).toBe('10 folhas inspecionadas')
    expect(descreverAmostra('praga', 0)).toBe('1 batida de 1 m')
  })
})
