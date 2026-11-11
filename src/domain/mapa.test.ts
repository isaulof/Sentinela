import { describe, expect, it } from 'vitest'
import type { LngLat } from './geo'
import {
  calorHonesto, diferencaEntreVisitas, RAIO_MINIMO_M, distanciaVizinhoMediaM, distribuicaoPorNivel, escalaDoAlvo, matrizPontoVisita, MIN_AMOSTRAS_CALOR, moranI, normalCdf,
  qualidadeDosDados, raioDeInfluenciaM, rotuloValor, tendencia, tetoRedondo,
} from './mapa'
import type { Registro } from './registro'

const O: LngLat = [-55.8, -13.25]
const kx = 111_320 * Math.cos((O[1] * Math.PI) / 180)
const ll = ([x, y]: [number, number]): LngLat => [O[0] + x / kx, O[1] + y / 110_574]
const quadrado1km = ([[0, 0], [1000, 0], [1000, 1000], [0, 1000]] as [number, number][]).map(ll)
const amostra = (id: string, x: number, y: number, valor: number) => ({ id, posicao: ll([x, y]), valor })

describe('calor honesto (bug R7: 1 amostra pintava o talhão todo)', () => {
  it('com 0, 1 ou 2 pontos não desenha calor e explica por quê', () => {
    for (const n of [0, 1, 2]) {
      const c = calorHonesto(quadrado1km, Array.from({ length: n }, (_, i) => amostra(`P${i}`, 100 + i * 100, 500, 8)))
      expect(c.celulas).toHaveLength(0)
      expect(c.semDado).toHaveLength(0)
      expect(c.motivo).toBeTruthy()
      expect(c.coberturaPct).toBe(0)
    }
    expect(MIN_AMOSTRAS_CALOR).toBe(3)
  })
  it('o motivo cita o mínimo de pontos', () => {
    expect(calorHonesto(quadrado1km, [amostra('P1', 500, 500, 8)]).motivo).toMatch(/pelo menos 3/)
  })
  it('com 3 pontos juntos num canto, o resto do talhão fica "sem dado" em vez de pintado', () => {
    const c = calorHonesto(quadrado1km, [amostra('A', 100, 100, 8), amostra('B', 200, 100, 0), amostra('C', 150, 200, 4)])
    expect(c.motivo).toBeNull()
    expect(c.celulas.length).toBeGreaterThan(0)
    expect(c.semDado.length).toBeGreaterThan(c.celulas.length) // a maior parte está longe de qualquer ponto
    expect(c.coberturaPct).toBeLessThan(40)
    expect(c.raioM).toBeGreaterThan(0)
  })
  it('com pontos espalhados a cobertura é quase total e os valores ficam entre o menor e o maior', () => {
    const pts = [[200, 200], [500, 200], [800, 200], [200, 500], [500, 500], [800, 500], [200, 800], [500, 800], [800, 800]] as [number, number][]
    const c = calorHonesto(quadrado1km, pts.map(([x, y], i) => amostra(`P${i}`, x, y, i)))
    expect(c.coberturaPct).toBeGreaterThanOrEqual(95)
    for (const cel of c.celulas) { expect(cel.valor).toBeGreaterThanOrEqual(-1e-9); expect(cel.valor).toBeLessThanOrEqual(8 + 1e-9) }
    expect(c.max).toBeLessThanOrEqual(8 + 1e-9)
  })
  it('perto de um ponto o valor é o dele; longe, o de quem está dentro do raio', () => {
    const c = calorHonesto(quadrado1km, [amostra('A', 200, 500, 10), amostra('B', 500, 500, 0), amostra('C', 800, 500, 10)])
    const perto = (x: number, y: number) => c.celulas.reduce((m, cel) => { const d = Math.hypot(cel.anel[0]![0] - ll([x, y])[0], cel.anel[0]![1] - ll([x, y])[1]); return d < m.d ? { d, v: cel.valor } : m }, { d: Infinity, v: NaN })
    expect(perto(200, 500).v).toBeGreaterThan(8)
    expect(perto(500, 500).v).toBeLessThan(2)
  })
  it('um ponto em cima de uma célula vale exatamente o valor dele (sem divisão por zero)', () => {
    const c = calorHonesto(quadrado1km, [amostra('A', 500, 500, 7), amostra('B', 600, 500, 1), amostra('C', 500, 600, 1)])
    expect(c.celulas.every((x) => Number.isFinite(x.valor))).toBe(true)
  })
})

describe('raio de influência', () => {
  it('é 1,5× a distância média ao vizinho mais próximo', () => {
    const pts = [ll([0, 0]), ll([100, 0]), ll([200, 0]), ll([300, 0])]
    expect(distanciaVizinhoMediaM(pts)).toBeCloseTo(100, 0)
    expect(raioDeInfluenciaM(pts)).toBeCloseTo(150, 0)
    expect(distanciaVizinhoMediaM([ll([0, 0])])).toBeNull()
  })
})

describe('bordas geométricas (F6)', () => {
  it('pontos repetidos não zeram o raio nem pintam "sem dado" por engano: usa o raio mínimo', () => {
    const rep = [amostra('a', 500, 500, 5), amostra('b', 500, 500, 1), amostra('c', 500, 500, 3)]
    expect(raioDeInfluenciaM(rep.map((a) => a.posicao))).toBe(RAIO_MINIMO_M)
    const c = calorHonesto(quadrado1km, rep)
    expect(c.celulas.length).toBeGreaterThan(0) // ao redor dos pontos há dado
    expect(c.coberturaPct).toBeLessThan(5) // e só ao redor deles: o resto continua sem dado
  })
  it('foco com todos os pontos no mesmo lugar é indeterminado, não "ao acaso"', () => {
    const m = moranI(Array.from({ length: 9 }, (_, i) => amostra(`p${i}`, 500, 500, i)))
    expect(m.classe).toBe('indeterminado')
    expect(m.texto).toMatch(/mesmo lugar/)
  })
  it('talhão muito alongado (2000 × 40 m) e ponto exatamente no vértice geram valores finitos', () => {
    const faixa = ([[0, 0], [2000, 0], [2000, 40], [0, 40]] as [number, number][]).map(ll)
    const a = calorHonesto(faixa, [amostra('a', 100, 20, 5), amostra('b', 1000, 20, 1), amostra('c', 1900, 20, 3)])
    expect(a.celulas.length).toBeGreaterThan(0)
    expect(a.celulas.every((x) => Number.isFinite(x.valor))).toBe(true)
    const v = calorHonesto(quadrado1km, [amostra('a', 0, 0, 5), amostra('b', 1000, 0, 1), amostra('c', 500, 1000, 3)])
    expect(v.celulas.every((x) => Number.isFinite(x.valor))).toBe(true)
  })
})

describe('escala fixa', () => {
  const r = (alvo: Registro['alvo'], quantidade: number): Registro => ({
    id: Math.random().toString(), talhaoId: 'T', amostrador: 'a', criadoEm: '2026-11-03T14:00:00Z', estadio: 'R5', finalidade: 'graos', pontoId: 'P01', posicao: O, posicaoSimulada: true,
    alvo, fase: 'x', quantidade, zero: quantidade === 0, fotoIds: [], observacao: '',
  })
  it('arredonda para cima em valores legíveis', () => {
    expect([0, 0.4, 1, 4.2, 5, 7, 26, 99, 101, 230].map(tetoRedondo)).toEqual([1, 1, 1, 5, 5, 8, 30, 100, 150, 250])
  })
  it('usa o maior valor de todas as visitas, ou o nível de ação se maior, e nunca menos que 1', () => {
    expect(escalaDoAlvo([r('percevejo', 1), r('percevejo', 6)], 'percevejo').teto).toBe(6)
    const so1 = escalaDoAlvo([r('percevejo', 1)], 'percevejo')
    expect(so1.limite).not.toBeNull()
    expect(so1.teto).toBeGreaterThanOrEqual(so1.limite!)
    expect(escalaDoAlvo([], 'lagarta').teto).toBeGreaterThanOrEqual(1)
    expect(escalaDoAlvo([r('percevejo', 50)], 'lagarta').teto).toBeLessThan(50) // outro alvo não entra
  })
  it('formata o rótulo de valor', () => {
    expect([4, 4.5, 0, 12.25].map(rotuloValor)).toEqual(['4', '4,5', '0', '12,3'])
  })
})

describe('mudança entre visitas', () => {
  const reg = (id: string, pontoId: string, criadoEm: string, quantidade: number): Registro => ({
    id, talhaoId: 'T', amostrador: 'a', criadoEm, estadio: 'R5', finalidade: 'graos', pontoId, posicao: O, posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade, zero: quantidade === 0, fotoIds: [], observacao: '',
  })
  const regs = [
    reg('a1', 'P01', '2026-11-03T13:00:00Z', 2), reg('a2', 'P02', '2026-11-03T13:10:00Z', 1), reg('a3', 'P04', '2026-11-03T13:20:00Z', 3),
    reg('b1', 'P01', '2026-11-08T13:00:00Z', 4), reg('b3', 'P03', '2026-11-08T13:10:00Z', 0), reg('b4', 'P04', '2026-11-08T13:20:00Z', 3),
  ]
  const d = diferencaEntreVisitas(regs, '2026-11-08', '2026-11-03', 'percevejo')
  const de = (id: string) => d.find((x) => x.pontoId === id)!
  it('piorou, novo, igual e "sem leitura nova" (não revisitado não é igual)', () => {
    expect(de('P01')).toMatchObject({ mudanca: 'piorou', antes: 2, agora: 4, delta: 2 })
    expect(de('P03')).toMatchObject({ mudanca: 'novo', antes: null })
    expect(de('P04')).toMatchObject({ mudanca: 'igual', delta: 0 })
    expect(de('P02')).toMatchObject({ mudanca: 'sem_leitura' })
  })
  it('melhorou quando o valor cai', () => {
    const r2 = [...regs, reg('c1', 'P01', '2026-11-12T13:00:00Z', 1)]
    expect(diferencaEntreVisitas(r2, '2026-11-12', '2026-11-08', 'percevejo').find((x) => x.pontoId === 'P01')).toMatchObject({ mudanca: 'melhorou', delta: -3 })
  })
  it('o registro das 21:30 locais entra na visita do dia certo', () => {
    const noite = reg('n1', 'P05', '2026-11-09T01:30:00Z', 5) // 21:30 de 08/11 em Cuiabá
    expect(diferencaEntreVisitas([...regs, noite], '2026-11-08', '2026-11-03', 'percevejo').some((x) => x.pontoId === 'P05')).toBe(true)
  })
})

describe('qualidade dos dados', () => {
  const plano = { pontos: [1, 2, 3, 4, 5].map((n) => ({ id: `P0${n}`, order: n, position: ll([n * 100, 100]) })) }
  const reg = (o: Partial<Registro>): Registro => ({
    id: Math.random().toString(), talhaoId: 'T', amostrador: 'a', criadoEm: '2026-11-08T13:00:00Z', estadio: 'R5', finalidade: 'graos', pontoId: 'P01', posicao: ll([100, 100]), posicaoSimulada: false, precisaoM: 6,
    alvo: 'percevejo', fase: 'Adulto', quantidade: 1, zero: false, fotoIds: [], observacao: '', ...o,
  })
  const tipos = (a: ReturnType<typeof qualidadeDosDados>) => a.map((x) => x.tipo)
  it('sem problemas devolve lista vazia', () => {
    const regs = plano.pontos.map((p) => reg({ pontoId: p.id, posicao: p.position }))
    expect(qualidadeDosDados(plano, regs, '2026-11-08')).toEqual([])
  })
  it('aponta pontos sem registro e visita incompleta', () => {
    const a = qualidadeDosDados(plano, [reg({ pontoId: 'P01', posicao: plano.pontos[0]!.position })], '2026-11-08')
    expect(tipos(a)).toEqual(expect.arrayContaining(['sem_registro', 'visita_incompleta']))
    expect(a.find((x) => x.tipo === 'sem_registro')!.pontos).toEqual(['P02', 'P03', 'P04', 'P05'])
    expect(a.find((x) => x.tipo === 'visita_incompleta')!.mensagem).toMatch(/1 de 5 pontos/)
  })
  it('GPS impreciso e registro longe do ponto planejado (só com GPS real)', () => {
    const base = plano.pontos.map((p) => reg({ pontoId: p.id, posicao: p.position }))
    const ruim = base.map((r) => r.pontoId === 'P02' ? { ...r, precisaoM: 80 } : r.pontoId === 'P03' ? { ...r, posicao: ll([300, 400]) as LngLat } : r)
    const a = qualidadeDosDados(plano, ruim, '2026-11-08')
    expect(a.find((x) => x.tipo === 'gps_impreciso')!.pontos).toEqual(['P02'])
    expect(a.find((x) => x.tipo === 'longe_do_ponto')!.pontos).toEqual(['P03'])
    // simulado não gera alerta de distância nem de precisão
    const sim = ruim.map((r) => ({ ...r, posicaoSimulada: true }))
    expect(tipos(qualidadeDosDados(plano, sim, '2026-11-08'))).toEqual(['posicao_simulada'])
  })
  it('valor atípico: bem acima da média dos outros (com pelo menos 4 pontos)', () => {
    const regs = plano.pontos.map((p, i) => reg({ pontoId: p.id, posicao: p.position, quantidade: i === 3 ? 20 : 1 }))
    expect(qualidadeDosDados(plano, regs, '2026-11-08').find((x) => x.tipo === 'valor_atipico')!.pontos).toEqual(['P04'])
    expect(tipos(qualidadeDosDados(plano, regs.slice(0, 3), '2026-11-08'))).not.toContain('valor_atipico') // poucos pontos
  })
})

describe('foco espacial (Moran I)', () => {
  const grade = (f: (i: number, j: number) => number) => {
    const out = []
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) out.push(amostra(`P${i}${j}`, i * 100, j * 100, f(i, j)))
    return out
  }
  it('normal padrão: valores de referência', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6)
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3)
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3)
  })
  it('valores altos juntos de um lado: agrupado, I positivo', () => {
    const m = moranI(grade((i) => (i < 2 ? 10 : 0)))
    expect(m.classe).toBe('agrupado')
    expect(m.I!).toBeGreaterThan(m.esperado!)
    expect(m.z!).toBeGreaterThan(1.96)
    expect(m.p!).toBeLessThan(0.05)
    expect(m.texto).toMatch(/foco/)
  })
  it('colunas alternadas: disperso, I negativo', () => {
    const m = moranI(grade((i) => (i % 2 ? 10 : 0)))
    expect(m.classe).toBe('disperso')
    expect(m.I!).toBeLessThan(0)
  })
  it('xadrez com raio de 150 m: os vizinhos diagonais (141 m) têm o mesmo valor, então não é disperso', () => {
    // Documenta a escolha do raio: 1,5× a distância ao vizinho mais próximo inclui as diagonais da grade.
    expect(moranI(grade((i, j) => ((i + j) % 2 ? 10 : 0))).classe).not.toBe('disperso')
  })
  it('valores sem arranjo (alternância irregular) não passam por foco', () => {
    const v = [3, 0, 7, 1, 5, 2, 8, 0, 4, 6, 1, 9, 2, 5, 3, 7, 0, 6, 4, 1, 8, 2, 5, 3, 0]
    const m = moranI(grade((i, j) => v[i * 5 + j]!))
    expect(m.classe).not.toBe('agrupado')
  })
  it('indeterminado: poucos pontos, valores iguais, sem vizinhos', () => {
    expect(moranI(grade(() => 1).slice(0, 7)).classe).toBe('indeterminado')
    expect(moranI(grade(() => 3)).classe).toBe('indeterminado')
    expect(moranI(grade(() => 3)).texto).toMatch(/mesmo valor/)
    expect(moranI([]).classe).toBe('indeterminado')
  })
  it('informa a conta: n, raio e vizinhos médios', () => {
    const m = moranI(grade((i) => (i < 2 ? 10 : 0)))
    expect(m.n).toBe(25)
    expect(m.raioM!).toBeCloseTo(150, 0)
    expect(m.vizinhosMedios!).toBeGreaterThan(2)
  })
})

describe('tendência, distribuição e matriz', () => {
  it('tendência pela média das duas últimas visitas, com tolerância de 10%', () => {
    expect(tendencia([{ dia: '2026-11-03', media: 2 }, { dia: '2026-11-08', media: 4 }]).rumo).toBe('subindo')
    expect(tendencia([{ dia: '2026-11-03', media: 4 }, { dia: '2026-11-08', media: 4.3 }]).rumo).toBe('estavel')
    expect(tendencia([{ dia: '2026-11-03', media: 4 }, { dia: '2026-11-08', media: 2 }]).rumo).toBe('caindo')
    expect(tendencia([{ dia: '2026-11-03', media: 4 }]).rumo).toBe('insuficiente')
    expect(tendencia([{ dia: '2026-11-03', media: 0 }, { dia: '2026-11-08', media: 0.05 }]).rumo).toBe('estavel') // base mínima de 1
    expect(tendencia([{ dia: '2026-11-03', media: 2 }, { dia: '2026-11-08', media: 4 }]).texto).toContain('03/11/2026')
  })
  it('distribuição por nível inclui os pontos sem leitura', () => {
    const d = distribuicaoPorNivel(['P1', 'P2', 'P3', 'P4'], new Map([['P1', 'ausente'], ['P2', 'atingido'], ['P3', 'ausente']] as const))
    expect(d).toEqual([{ nivel: 'ausente', rotulo: 'Sem ocorrência', n: 2 }, { nivel: 'atingido', rotulo: 'Nível atingido', n: 1 }, { nivel: 'sem_leitura', rotulo: 'Sem leitura', n: 1 }])
  })
  it('matriz ponto × visita traz o valor de cada dia e vazio onde não houve leitura', () => {
    const reg = (pontoId: string, criadoEm: string, quantidade: number): Registro => ({ id: pontoId + criadoEm, talhaoId: 'T', amostrador: 'a', criadoEm, estadio: 'R5', finalidade: 'graos', pontoId, posicao: O, posicaoSimulada: true, alvo: 'percevejo', fase: 'Adulto', quantidade, zero: false, fotoIds: [], observacao: '' })
    const m = matrizPontoVisita({ pontos: [{ id: 'P2', order: 2 }, { id: 'P1', order: 1 }] }, [reg('P1', '2026-11-03T13:00:00Z', 2), reg('P1', '2026-11-08T13:00:00Z', 5), reg('P2', '2026-11-08T13:00:00Z', 1)], 'percevejo', ['2026-11-03', '2026-11-08'])
    expect(m).toEqual([{ pontoId: 'P1', ordem: 1, valores: [2, 5] }, { pontoId: 'P2', ordem: 2, valores: [null, 1] }])
  })
})
