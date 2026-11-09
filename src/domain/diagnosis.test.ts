import { describe, expect, it } from 'vitest'
import { ARVORES, DIFERENCIAL_FOLIAR, FAIXA_20M, TRIAGEM } from '@/knowledge/arvores'
import { ICONES } from '@/ui/components/iconPaths'
import { GUIA } from '@/knowledge/guia'
import { percorrer, validarArvore } from './diagnosis'

describe('integridade das árvores', () => {
  it.each(ARVORES.map((a) => [a.id, a] as const))('%s é íntegra', (_, a) => {
    expect(validarArvore(a)).toEqual([])
  })
  it('detecta destino inexistente, nó órfão e ciclo', () => {
    const ruim = { ...TRIAGEM, nos: { ...TRIAGEM.nos, orfao: TRIAGEM.nos['biotico']!, padrao: { tipo: 'pergunta' as const, texto: 'x', opcoes: [{ rotulo: 'a', destino: 'nada' }, { rotulo: 'b', destino: 'padrao' }] } } }
    const e = validarArvore(ruim).join('|')
    expect(e).toMatch(/inexistente/)
    expect(e).toMatch(/inalcançável/)
    expect(e).toMatch(/ciclo/)
  })
})

describe('percorrer', () => {
  it('triagem: faixa operacional sem sinais → abiótico', () => {
    const p = percorrer(TRIAGEM, [0, 0, 0])
    expect(p.noId).toBe('abiotico_operacional')
    expect(p.trilha).toHaveLength(3)
    expect(p.no.tipo === 'resultado' && p.no.categoria).toBe('abiotico')
  })
  it('triagem: reboleira com sinais → biótico', () => {
    const p = percorrer(TRIAGEM, [1, 0])
    expect(p.no.tipo === 'resultado' && p.no.categoria).toBe('biotico')
  })
  it('triagem: sem sinais e progressão gradual → inconclusivo (não afirma biótico)', () => {
    const p = percorrer(TRIAGEM, [2, 1])
    expect(p.no.tipo === 'resultado' && p.no.categoria).toBe('inconclusivo')
  })
  it('faixa de 20 m: todos os passos positivos e sem sinais → NÃO aplicar fungicida', () => {
    const p = percorrer(FAIXA_20M, [0, 0, 0, 0])
    expect(p.noId).toBe('operacional')
    expect(p.no.tipo === 'resultado' && p.no.proximosPassos.join(' ')).toMatch(/NÃO aplicar fungicida/)
  })
  it('faixa de 20 m: sinais biológicos mudam a conclusão', () => {
    expect(percorrer(FAIXA_20M, [0, 0, 0, 1]).noId).toBe('biotico_sistemico')
  })
  it('diferencial foliar: anéis concêntricos → mancha-alvo', () => {
    expect(percorrer(DIFERENCIAL_FOLIAR, [0]).noId).toBe('alvo')
    expect(percorrer(DIFERENCIAL_FOLIAR, [1, 0]).noId).toBe('dfc')
    expect(percorrer(DIFERENCIAL_FOLIAR, [1, 1]).noId).toBe('inconclusivo')
  })
  it('opção inexistente lança erro', () => {
    expect(() => percorrer(TRIAGEM, [9])).toThrow(RangeError)
  })
  it('toda conclusão traz próximos passos e fonte ou origem de projeto', () => {
    for (const a of ARVORES) {
      expect(a.fontes.length).toBeGreaterThan(0)
      for (const n of Object.values(a.nos)) if (n.tipo === 'resultado') expect(n.proximosPassos.length).toBeGreaterThan(0)
    }
  })
})

describe('guia em funil (usuário leigo)', () => {
  it('é íntegro e todo caminho termina em no máximo 4 perguntas', () => {
    expect(validarArvore(GUIA)).toEqual([])
    const fundo = (id: string, d: number): number => {
      const n = GUIA.nos[id]!
      return n.tipo === 'resultado' ? d : Math.max(...n.opcoes.map((o) => fundo(o.destino, d + 1)))
    }
    expect(fundo(GUIA.raiz, 0)).toBeLessThanOrEqual(4)
  })
  it('nenhuma resposta manda aplicar defensivo e toda pergunta tem no máximo 5 opções', () => {
    for (const n of Object.values(GUIA.nos)) {
      if (n.tipo === 'pergunta') expect(n.opcoes.length).toBeLessThanOrEqual(5)
      else expect(JSON.stringify(n).toLowerCase()).not.toMatch(/\b(aplique|pulverize|aplicar agora)\b/)
    }
  })
  it('todo ícone citado existe no conjunto de ícones do app', () => {
    for (const n of Object.values(GUIA.nos)) if (n.tipo === 'pergunta') for (const o of n.opcoes) if (o.icone) expect(ICONES).toContain(o.icone)
  })
  it('ferrugem leva ao agrônomo e à detecção, sem número de plantas doentes', () => {
    const r = percorrer(GUIA, [0, 0])
    expect(r.no.tipo === 'resultado' && r.no.alvo).toBe('ferrugem')
    expect(r.no.tipo === 'resultado' && r.no.urgencia).toBe('chamar')
  })
  it('percevejo e lagarta citam os níveis de ação da Embrapa', () => {
    const perc = percorrer(GUIA, [2, 1]).no
    const lag = percorrer(GUIA, [2, 0]).no
    expect(perc.tipo === 'resultado' && perc.explicacao).toMatch(/2 percevejos por metro/)
    expect(lag.tipo === 'resultado' && lag.explicacao).toMatch(/20 lagartas/)
  })
})
