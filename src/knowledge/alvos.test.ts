import { describe, expect, it } from 'vitest'
import { ALVOS, ALVOS_DE_ROTINA, LISTA_ALVOS, OUTRAS_DOENCAS, OUTRAS_PRAGAS, type AlvoId } from './alvos'
import { CANDIDATOS } from './diagnostico'
import { FONTES } from './fontes'
import { METODOS_DE_COLETA, metodosPara } from './metodos'
import { ESTADIOS } from '@/domain/phenology'

const NOVOS: Record<string, string> = { anticarsia: 'anticarsia', helicoverpa: 'lagarta_vagem', moscaBranca: 'mosca_branca', vaquinha: 'vaquinha', acaro: 'acaro', pulgao: 'pulgao', tamandua: 'tamandua', elasmo: 'elasmo', coro: 'coro', oidio: 'oidio', finalCiclo: 'dfc', antracnose: 'antracnose', bacteriose: 'bacteriose', olhoDeRa: 'olho_de_ra', raizHaste: 'raiz_haste' }

describe('catálogo de alvos do registro', () => {
  it('tem os 5 de rotina de sempre e mais 9 pragas e 6 doenças registráveis', () => {
    expect(ALVOS_DE_ROTINA.map((a) => a.id)).toEqual(['percevejo', 'lagarta', 'ferrugem', 'mofo', 'manchaAlvo'])
    expect(OUTRAS_PRAGAS).toHaveLength(9)
    expect(OUTRAS_DOENCAS).toHaveLength(6)
    expect(LISTA_ALVOS).toHaveLength(20)
  })
  it('cada alvo está completo: nomes, protocolo, fases, unidade, estádio e fonte válidos', () => {
    for (const [chave, a] of Object.entries(ALVOS)) {
      expect(a.id, chave).toBe(chave)
      expect(a.nome.length, chave).toBeGreaterThan(2)
      expect(a.cientifico.length, chave).toBeGreaterThan(3)
      for (const campo of ['metodo', 'unidade', 'parte'] as const) expect(a.coleta[campo].length, `${chave}.${campo}`).toBeGreaterThan(10)
      expect(a.fases.length, chave).toBeGreaterThanOrEqual(1)
      expect(new Set(a.fases).size, `${chave} fases repetidas`).toBe(a.fases.length)
      expect(a.unidade.length, chave).toBeGreaterThan(1)
      expect((ESTADIOS as string[]).includes(a.estadioMin), `${chave} estádio`).toBe(true)
      expect(a.fontes.length, chave).toBeGreaterThanOrEqual(1)
      for (const f of a.fontes) expect(FONTES[f], `${chave} fonte ${f}`).toBeDefined()
    }
  })
  it('nomes não se repetem (nem com outra maiúscula)', () => {
    const nomes = LISTA_ALVOS.map((a) => a.nome.toLowerCase())
    expect(new Set(nomes).size).toBe(nomes.length)
  })
  it('os nomes e nomes científicos são os do catálogo do diagnóstico: as duas telas falam dos mesmos problemas', () => {
    for (const [alvoId, candidatoId] of Object.entries(NOVOS)) {
      const c = CANDIDATOS.find((x) => x.id === candidatoId)
      expect(c, candidatoId).toBeDefined()
      expect(ALVOS[alvoId as AlvoId].nome, alvoId).toBe(c!.nome)
      if (c!.cientifico) expect(ALVOS[alvoId as AlvoId].cientifico, alvoId).toBe(c!.cientifico)
      expect(ALVOS[alvoId as AlvoId].tipo, alvoId).toBe(c!.tipo)
    }
  })
  it('só os alvos com fonte numérica confirmada têm nível de ação; os demais são decisão de projeto', () => {
    const comFonte = LISTA_ALVOS.filter((a) => !a.fontes.includes('projeto')).map((a) => a.id).sort()
    expect(comFonte).toEqual(['anticarsia', 'finalCiclo', 'ferrugem', 'lagarta', 'manchaAlvo', 'mofo', 'percevejo'].sort())
  })
  it('desfolha só nos que desfolham (lagartas e vaquinhas)', () => {
    expect(LISTA_ALVOS.filter((a) => a.desfolha).map((a) => a.id).sort()).toEqual(['anticarsia', 'lagarta', 'vaquinha'])
  })
})

describe('método de coleta (pergunta opcional)', () => {
  it('praga e doença têm opções próprias, e todas têm "Outro método"', () => {
    const p = metodosPara('praga').map((m) => m.nome)
    const d = metodosPara('doenca').map((m) => m.nome)
    expect(p).toContain('Pano de batida'); expect(p).not.toContain('Arranque de plantas e corte da haste')
    expect(d).toContain('Arranque de plantas e corte da haste'); expect(d).not.toContain('Pano de batida')
    expect(p).toContain('Outro método (descreva na observação)'); expect(d).toContain('Outro método (descreva na observação)')
  })
  it('ids e nomes únicos', () => {
    expect(new Set(METODOS_DE_COLETA.map((m) => m.id)).size).toBe(METODOS_DE_COLETA.length)
    expect(new Set(METODOS_DE_COLETA.map((m) => m.nome)).size).toBe(METODOS_DE_COLETA.length)
  })
})
