import { describe, expect, it } from 'vitest'
import { camposDoRegistro, coordenada, resumoPorPonto, condicoesDoRegistro, duracaoDoRegistro, estadoDaVersao, linhaDoTempoDoPonto, medidaDoRegistro, posicaoDoRegistro, rastroDaVersao, resumoDoRegistro } from './ficha'
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

describe('campos do registro (ficha e relatório)', () => {
  const rotulos = (r: Registro, completo: boolean) => camposDoRegistro(r, completo).map((c) => c.rotulo)
  const v2 = reg({
    schema: 2, metodo: 'Pano de batida de 1 m', protocoloVersao: '2026-11', parteDaPlanta: 'Plantas da fileira', areaAmostrada: '5 batidas de 1 m', condicoes: { tempo: 'nublado' },
    responsavel: 'Prof. Resp.', precisaoM: 6.4, distanciaDoPontoM: 3.2, posicaoPlanejada: [-55.9001, -13.0501], inicioEm: '2026-11-11T17:20:00Z', fimEm: '2026-11-11T17:24:00Z', fusoHorario: 'America/Cuiaba', observacao: 'manchas',
  })
  it('a ficha na tela traz o essencial', () => {
    expect(rotulos(v2, false)).toEqual(['Método', 'Amostra', 'Fase', 'Condições', 'Coletado por', 'Responsável técnico', 'Posição', 'Duração', 'Observação'])
  })
  it('o relatório completo acrescenta estádio, onde olhar, coordenadas, ponto planejado, horário e protocolo', () => {
    const r = rotulos(v2, true)
    for (const k of ['Estádio da soja', 'Onde olhar', 'Coordenadas (lat / lon)', 'Ponto planejado (lat / lon)', 'Amostragem', 'Protocolo']) expect(r).toContain(k)
    expect(r).not.toContain('Duração') // já vai dentro de Amostragem
    const val = (chave: string) => camposDoRegistro(v2, true).find((c) => c.chave === chave)!.valor
    expect(val('coordenadas')).toBe('-13,050000 / -55,900000')
    expect(val('planejada')).toBe('-13,050100 / -55,900100')
    expect(val('horario')).toBe('13:20 às 13:24 (4 min)')
    expect(val('protocolo')).toBe('versão 2026-11')
    expect(val('posicao')).toBe('GPS ±6 m · a 3 m do ponto')
  })
  it('com posição simulada (igual ao ponto planejado) não repete a coordenada; só os textos longos pedem linha inteira', () => {
    const sim = reg({ posicaoSimulada: true, posicao: [-55.9, -13.05], posicaoPlanejada: [-55.9, -13.05], metodo: 'Pano', observacao: 'x', schema: 2 })
    const c = camposDoRegistro(sim, true)
    expect(c.find((x) => x.chave === 'planejada')).toBeUndefined()
    expect(c.filter((x) => x.largo).map((x) => x.chave)).toEqual(['metodo', 'observacao'])
  })
  it('registro antigo mostra "método não informado" e não inventa o que falta', () => {
    const antigo = reg({ schema: 1 })
    const c = camposDoRegistro(antigo, true)
    expect(c.find((x) => x.chave === 'metodo')!.valor).toMatch(/não informado/)
    for (const k of ['amostra', 'condicoes', 'responsavel', 'planejada', 'horario', 'protocolo', 'duracao', 'observacao']) expect(c.find((x) => x.chave === k), k).toBeUndefined()
  })
  it('coordenada com 6 casas e vírgula', () => expect(coordenada(-13.2543879)).toBe('-13,254388'))
})

describe('resumo por ponto', () => {
  const plano = { pontos: [{ id: 'P02', order: 2, position: [-55.9, -13.05] as const }, { id: 'P01', order: 1, position: [-55.91, -13.06] as const }] }
  it('uma linha por ponto, em ordem, com contagem e o registro mais recente', () => {
    const r = resumoPorPonto(plano, [reg({ id: 'a', pontoId: 'P01', criadoEm: '2026-11-03T13:00:00Z' }), reg({ id: 'b', pontoId: 'P01', criadoEm: '2026-11-08T13:00:00Z' })], new Map([['P01', 'leve' as const]]))
    expect(r.map((x) => x.ordem)).toEqual([1, 2])
    expect(r[0]).toMatchObject({ pontoId: 'P01', estado: 'leve', registros: 2 })
    expect(r[0]!.ultimo!.id).toBe('b')
    expect(r[1]).toMatchObject({ pontoId: 'P02', estado: 'a_coletar', registros: 0, ultimo: null })
  })
})

describe('medida em palavras para os alvos novos', () => {
  it('cada praga se lê na sua unidade, não sempre "por metro"', () => {
    expect(medidaDoRegistro(reg({ alvo: 'moscaBranca', quantidade: 4 }))).toBe('4 por folha')
    expect(medidaDoRegistro(reg({ alvo: 'pulgao', quantidade: 2 }))).toBe('2 por planta')
    expect(medidaDoRegistro(reg({ alvo: 'coro', quantidade: 1 }))).toBe('1 por trincheira')
    expect(medidaDoRegistro(reg({ alvo: 'acaro', quantidade: 3 }))).toBe('3 em 10 folhas')
    expect(medidaDoRegistro(reg({ alvo: 'helicoverpa', quantidade: 2 }))).toBe('2 por metro')
    expect(medidaDoRegistro(reg({ alvo: 'anticarsia', quantidade: 6, desfolhaPct: 10 }))).toBe('6 por metro · desfolha 10%')
    expect(medidaDoRegistro(reg({ alvo: 'oidio', quantidade: 0, presente: true, severidadePct: 4 }))).toBe('presente · 4%')
  })
})

describe('método informado pela pessoa (opcional)', () => {
  const base = reg({ schema: 2, metodo: 'Pano de batida branco de 1 m' })
  it('sem método informado, vale o do protocolo e o rótulo continua "Método"', () => {
    const c = camposDoRegistro(base, true)
    expect(c.find((x) => x.chave === 'metodo')).toMatchObject({ rotulo: 'Método', valor: 'Pano de batida branco de 1 m' })
    expect(c.find((x) => x.chave === 'metodoProtocolo')).toBeUndefined()
  })
  it('com método informado, aparece como "Método usado" e o do protocolo fica ao lado, no relatório', () => {
    const r = reg({ schema: 2, metodo: 'Pano de batida branco de 1 m', metodoUsado: 'Inspeção visual das plantas' })
    const completo = camposDoRegistro(r, true)
    expect(completo.find((x) => x.chave === 'metodo')).toMatchObject({ rotulo: 'Método usado', valor: 'Inspeção visual das plantas', largo: true })
    expect(completo.find((x) => x.chave === 'metodoProtocolo')).toMatchObject({ rotulo: 'Método do protocolo', valor: 'Pano de batida branco de 1 m' })
    // Na ficha curta mostra só o método usado.
    const curto = camposDoRegistro(r, false)
    expect(curto.find((x) => x.chave === 'metodo')!.valor).toBe('Inspeção visual das plantas')
    expect(curto.find((x) => x.chave === 'metodoProtocolo')).toBeUndefined()
  })
  it('método em branco ou só espaços conta como não informado', () => {
    expect(camposDoRegistro(reg({ schema: 2, metodo: 'P', metodoUsado: '   ' }), true).find((x) => x.chave === 'metodo')!.rotulo).toBe('Método')
  })
})
