import { describe, expect, it } from 'vitest'
import { avaliar } from './decision'
import { atingiu, isEstadio, ordem } from './phenology'

describe('fenologia', () => {
  it('ordena os estádios corretamente', () => {
    expect(ordem('VE')).toBeLessThan(ordem('V1'))
    expect(ordem('V12')).toBeLessThan(ordem('R1'))
    expect(ordem('R3')).toBeLessThan(ordem('R8'))
    expect(atingiu('R5', 'R3')).toBe(true)
    expect(atingiu('V4', 'R3')).toBe(false)
  })
  it('valida estádios', () => {
    for (const ok of ['VE', 'VC', 'V1', 'V12', 'R1', 'R8']) expect(isEstadio(ok)).toBe(true)
    for (const bad of ['R9', 'V0', 'X1', '', 'R', 'v1']) expect(isEstadio(bad)).toBe(false)
    expect(() => ordem('R9')).toThrow()
  })
})

describe('percevejo-marrom', () => {
  const base = { alvo: 'percevejo' as const, estadio: 'R5' }
  it('nível de 2/m para grãos', () => {
    expect(avaliar({ ...base, quantidade: 2 }).nivel).toBe('atingido')
    expect(avaliar({ ...base, quantidade: 1 }).nivel).toBe('abaixo')
    expect(avaliar({ ...base, quantidade: 1.5 }).nivel).toBe('proximo')
  })
  it('nível de 1/m para sementes', () => {
    expect(avaliar({ ...base, quantidade: 1, finalidade: 'sementes' }).nivel).toBe('atingido')
  })
  it('não decide antes de R3 (sem vagens)', () => {
    expect(avaliar({ ...base, estadio: 'R1', quantidade: 5 }).nivel).toBe('abaixo')
  })
  it('fora da janela antes de V4', () => {
    expect(avaliar({ ...base, estadio: 'V2', quantidade: 5 }).nivel).toBe('nao_aplicavel')
  })
  it('zero é registrado como ausente', () => {
    expect(avaliar({ ...base, quantidade: 0 }).nivel).toBe('ausente')
  })
})

describe('lagarta-falsa-medideira', () => {
  it('20 lagartas > 1,5 cm/m atinge o nível', () => {
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 20 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 5 }).nivel).toBe('abaixo')
  })
  it('desfolha: 30% no vegetativo, 15% no reprodutivo', () => {
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 30 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 25 }).nivel).toBe('proximo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'V6', quantidade: 0, desfolhaPct: 10 }).nivel).toBe('abaixo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 15 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 5 }).nivel).toBe('abaixo')
    expect(avaliar({ alvo: 'lagarta', estadio: 'R2', quantidade: 0, desfolhaPct: 0 }).nivel).toBe('ausente')
  })
})

describe('doenças sem limite oficial', () => {
  it('ferrugem detectada gera detecção, nunca "nível de ação"', () => {
    const r = avaliar({ alvo: 'ferrugem', estadio: 'R2', quantidade: 0, presente: true })
    expect(r.nivel).toBe('deteccao')
    expect(r.detalhe).toMatch(/agrônomo/)
  })
  it('sem sinais vira ausente', () => {
    expect(avaliar({ alvo: 'mofo', estadio: 'R2', quantidade: 0, presente: false }).nivel).toBe('ausente')
  })
  it('mofo-branco fora da janela antes de R1', () => {
    expect(avaliar({ alvo: 'mofo', estadio: 'V6', quantidade: 0, presente: true }).nivel).toBe('nao_aplicavel')
  })
})

describe('lagarta-da-soja (mesmo nível da falsa-medideira, pela Caderneta)', () => {
  it('20 lagartas grandes por metro atingem o nível de ação; menos que isso, não', () => {
    expect(avaliar({ alvo: 'anticarsia', estadio: 'V6', quantidade: 20 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'anticarsia', estadio: 'V6', quantidade: 5 }).nivel).toBe('abaixo')
    expect(avaliar({ alvo: 'anticarsia', estadio: 'V6', quantidade: 0 }).nivel).toBe('ausente')
  })
  it('desfolha acima de 30% no vegetativo e de 15% no reprodutivo, como a falsa-medideira', () => {
    expect(avaliar({ alvo: 'anticarsia', estadio: 'V6', quantidade: 2, desfolhaPct: 31 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'anticarsia', estadio: 'R3', quantidade: 2, desfolhaPct: 16 }).nivel).toBe('atingido')
    expect(avaliar({ alvo: 'anticarsia', estadio: 'R3', quantidade: 2, desfolhaPct: 5 }).nivel).not.toBe('atingido')
  })
  it('as duas lagartas dão o mesmo resultado para os mesmos números', () => {
    for (const o of [{ quantidade: 0 }, { quantidade: 10 }, { quantidade: 20, desfolhaPct: 10 }, { quantidade: 3, desfolhaPct: 40 }]) {
      expect(avaliar({ alvo: 'anticarsia', estadio: 'V6', ...o }).nivel).toBe(avaliar({ alvo: 'lagarta', estadio: 'V6', ...o }).nivel)
    }
  })
})

describe('pragas sem nível de ação numérico: detecção para o agrônomo', () => {
  const praga = (alvo: 'moscaBranca' | 'vaquinha' | 'acaro' | 'elasmo' | 'coro', quantidade: number) => avaliar({ alvo, estadio: 'V4', quantidade })
  it('zero é "nenhuma ocorrência"; qualquer contagem vira detecção, nunca "nível de ação atingido"', () => {
    for (const a of ['moscaBranca', 'vaquinha', 'acaro', 'elasmo', 'coro'] as const) {
      expect(praga(a, 0).nivel, a).toBe('ausente')
      for (const q of [1, 5, 50, 500]) expect(praga(a, q).nivel, `${a} ${q}`).toBe('deteccao')
    }
  })
  it('a mensagem diz que não há limite numérico e que a decisão é do agrônomo, sem recomendar produto', () => {
    const r = praga('vaquinha', 3)
    expect(r.titulo).toBe('Detecção: Vaquinhas e besouros pequenos')
    expect(r.detalhe).toMatch(/3 bes\.\/m/)
    expect(r.detalhe).toMatch(/Não há nível de ação numérico/)
    expect(r.detalhe).toMatch(/agrônomo, que decide o manejo/)
    expect(`${r.titulo} ${r.detalhe}`).not.toMatch(/aplicar|aplicação|inseticida|fungicida/i)
  })
  it('traz a fonte do alvo (decisão de projeto)', () => expect(praga('acaro', 2).fontes).toEqual(['projeto']))
})

describe('níveis de ação da Embrapa (Sistemas de Produção 17)', () => {
  const lag = (alvo: 'spodoptera' | 'helicoverpa', quantidade: number, estadio: string, desfolhaPct?: number) => avaliar({ alvo, estadio, quantidade, desfolhaPct })
  it('lagartas-das-vagens (Spodoptera): 10 por metro', () => {
    expect(lag('spodoptera', 9, 'R3').nivel).toBe('proximo')
    expect(lag('spodoptera', 10, 'R3').nivel).toBe('atingido')
    expect(lag('spodoptera', 3, 'R3').nivel).toBe('abaixo')
    expect(lag('spodoptera', 0, 'R3').nivel).toBe('ausente')
  })
  it('lagarta-helicoverpa: 4 por metro no vegetativo e 2 no reprodutivo', () => {
    expect(lag('helicoverpa', 3, 'V6').nivel).toBe('proximo')
    expect(lag('helicoverpa', 4, 'V6').nivel).toBe('atingido')
    expect(lag('helicoverpa', 2, 'R2').nivel).toBe('atingido')
    expect(lag('helicoverpa', 1, 'R2').nivel).toBe('abaixo')
  })
  it('a desfolha vale para as duas: 30% no vegetativo, 15% no reprodutivo', () => {
    expect(lag('spodoptera', 1, 'V6', 30).nivel).toBe('atingido')
    expect(lag('helicoverpa', 1, 'R3', 15).nivel).toBe('atingido')
    expect(lag('helicoverpa', 1, 'R3', 5).nivel).toBe('abaixo')
  })
  it('broca-das-axilas: % de plantas com ponteiros atacados', () => {
    const b = (q: number) => avaliar({ alvo: 'broca', estadio: 'V6', quantidade: q }).nivel
    expect([b(0), b(10), b(20), b(25), b(40)]).toEqual(['ausente', 'abaixo', 'proximo', 'atingido', 'atingido'])
  })
  it('tamanduá-da-soja: 1 adulto/m até V3, 2 de V4 a V6, nenhum depois de V6', () => {
    const t = (q: number, e: string) => avaliar({ alvo: 'tamandua', estadio: e, quantidade: q }).nivel
    expect(t(1, 'V2')).toBe('atingido')
    expect(t(1, 'V5')).toBe('abaixo')
    expect(t(2, 'V5')).toBe('atingido')
    expect(t(5, 'V7')).toBe('nao_aplicavel')
    expect(t(5, 'R2')).toBe('nao_aplicavel')
  })
  it('a fonte é o Sistemas de Produção 17, e o texto não manda aplicar nada', () => {
    const r = lag('spodoptera', 12, 'R3')
    expect(r.fontes).toEqual(['sp17pragas'])
    expect(`${r.titulo} ${r.detalhe}`).not.toMatch(/\b(aplique|aplicar|pulverize)\b/i)
  })
})

describe('doenças novas: detecção para o agrônomo', () => {
  const doenca = (alvo: 'oidio' | 'antracnose' | 'bacteriose' | 'olhoDeRa' | 'raizHaste' | 'finalCiclo' | 'mela', o: { presente?: boolean; severidadePct?: number }, estadio = 'R3') => avaliar({ alvo, estadio, quantidade: 0, ...o })
  it('sem sinais é ausente; com sinal ou severidade é detecção', () => {
    for (const a of ['oidio', 'antracnose', 'bacteriose', 'olhoDeRa', 'raizHaste', 'finalCiclo', 'mela'] as const) {
      expect(doenca(a, { presente: false }).nivel, a).toBe('ausente')
      expect(doenca(a, { presente: true, severidadePct: 3 }).nivel, a).toBe('deteccao')
    }
  })
  it('não há nível de ação inventado: severidade alta continua sendo detecção', () => {
    expect(doenca('oidio', { presente: true, severidadePct: 90 }).nivel).toBe('deteccao')
  })
  it('doenças de final de ciclo só valem a partir de R1 (fonte CT 205); antes, fora da janela', () => {
    expect(doenca('finalCiclo', { presente: true, severidadePct: 5 }, 'V6').nivel).toBe('nao_aplicavel')
    expect(doenca('finalCiclo', { presente: true, severidadePct: 5 }, 'R1').nivel).toBe('deteccao')
  })
})
