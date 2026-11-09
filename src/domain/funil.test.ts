import { describe, expect, it } from 'vitest'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { classificar, confianca, ganhoDaPergunta, podeEncerrar, proximaPergunta, validarBase, type Candidato, type PerguntaFunil } from './funil'

describe('base de conhecimento do guia', () => {
  it('é íntegra: perfis citam só perguntas e opções que existem', () => {
    expect(validarBase(PERGUNTAS, CANDIDATOS)).toEqual([])
  })
  it('cobre pragas, doenças e causas não vivas', () => {
    const tipos = new Set(CANDIDATOS.map((c) => c.tipo))
    expect([...tipos].sort()).toEqual(['abiotico', 'doenca', 'praga'])
  })
  it('detecta opção inexistente e candidato sem conteúdo', () => {
    const ruim: Candidato = { ...CANDIDATOS[0]!, id: 'x', perfil: { onde: { inexistente: 'tipico' }, fantasma: { a: 'raro' } }, proximosPassos: [], fontes: [] }
    const e = validarBase(PERGUNTAS, [ruim]).join('|')
    expect(e).toMatch(/opção "inexistente"/)
    expect(e).toMatch(/pergunta "fantasma"/)
    expect(e).toMatch(/sem próximos passos/)
    expect(e).toMatch(/sem fonte/)
  })
})

describe('classificar', () => {
  it('sem respostas, todos têm a mesma compatibilidade e somam 100%', () => {
    const r = classificar(CANDIDATOS, {})
    expect(r.every((x) => Math.abs(x.compat - 1 / CANDIDATOS.length) < 1e-9)).toBe(true)
  })
  it('as compatibilidades sempre somam 1', () => {
    const r = classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo' })
    expect(r.reduce((a, x) => a + x.compat, 0)).toBeCloseTo(1, 9)
  })
  it('pústulas por baixo das folhas de baixo apontam ferrugem em primeiro', () => {
    const r = classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo' })
    expect(r[0]!.candidato.id).toBe('ferrugem')
  })
  it('círculos com anéis apontam mancha-alvo; pó branco aponta oídio', () => {
    expect(classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'alvo' })[0]!.candidato.id).toBe('manchaalvo')
    expect(classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'po_branco' })[0]!.candidato.id).toBe('oidio')
  })
  it('percevejo + vagem chocha → percevejo-marrom; mofo algodão na haste → mofo-branco', () => {
    expect(classificar(CANDIDATOS, { onde: 'vagem', bicho: 'percevejo', grao: 'chochas_manchadas' })[0]!.candidato.id).toBe('percevejo')
    expect(classificar(CANDIDATOS, { onde: 'haste_raiz', mofo: 'algodao', raiz: 'mofo_branco' })[0]!.candidato.id).toBe('mofo')
  })
  it('faixas retas sem bicho nem doença apontam efeito de produto', () => {
    expect(classificar(CANDIDATOS, { onde: 'folha_cor', mancha: 'nenhuma', bicho: 'nenhum', terreno: 'faixas' })[0]!.candidato.id).toBe('fitotoxidez')
  })
  it('galhas na raiz apontam nematoides', () => {
    expect(classificar(CANDIDATOS, { onde: 'murcha', raiz: 'galhas', terreno: 'reboleira' })[0]!.candidato.id).toBe('nematoide')
  })
  it('o resultado não depende da ordem das respostas', () => {
    const a = classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'alvo', altura: 'meio' }).map((x) => x.candidato.id)
    const b = classificar(CANDIDATOS, { altura: 'meio', mancha: 'alvo', onde: 'folha_mancha' }).map((x) => x.candidato.id)
    expect(a).toEqual(b)
  })
})

describe('próxima pergunta', () => {
  it('a primeira pergunta é a de maior ganho e nunca repete uma respondida', () => {
    const p1 = proximaPergunta(PERGUNTAS, CANDIDATOS, {})!
    expect(p1).toBeTruthy()
    const p2 = proximaPergunta(PERGUNTAS, CANDIDATOS, { [p1.id]: p1.opcoes[0]!.id })
    expect(p2?.id).not.toBe(p1.id)
  })
  it('a pergunta de abertura, quando indicada, vem sempre primeiro', () => {
    expect(proximaPergunta(PERGUNTAS, CANDIDATOS, {}, new Set(), 'onde')?.id).toBe('onde')
    expect(proximaPergunta(PERGUNTAS, CANDIDATOS, { onde: 'vagem' }, new Set(), 'onde')?.id).not.toBe('onde')
  })
  it('pergunta pulada não volta', () => {
    const p1 = proximaPergunta(PERGUNTAS, CANDIDATOS, {})!
    expect(proximaPergunta(PERGUNTAS, CANDIDATOS, {}, new Set([p1.id]))?.id).not.toBe(p1.id)
  })
  it('o ganho de uma pergunta que não separa ninguém é zero', () => {
    const cands: Candidato[] = [{ ...CANDIDATOS[0]!, id: 'a', perfil: {} }, { ...CANDIDATOS[1]!, id: 'b', perfil: {} }]
    const q: PerguntaFunil = { id: 'q', texto: 'x', opcoes: [{ id: 'o1', rotulo: 'a' }, { id: 'o2', rotulo: 'b' }] }
    expect(ganhoDaPergunta(q, classificar(cands, {}))).toBeCloseTo(0, 9)
  })
  it('um caminho típico termina em poucas perguntas com resposta clara', () => {
    let resp: Record<string, string> = {}
    const certo: Record<string, string> = { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo', bicho: 'nenhum', mofo: 'nada', raiz: 'normal', terreno: 'reboleira', grao: 'normais' }
    let n = 0
    for (; n < 8; n++) {
      const rank = classificar(CANDIDATOS, resp)
      const prox = proximaPergunta(PERGUNTAS, CANDIDATOS, resp)
      if (podeEncerrar(rank, n, !!prox)) break
      resp = { ...resp, [prox!.id]: certo[prox!.id]! }
    }
    expect(n).toBeLessThanOrEqual(6)
    expect(classificar(CANDIDATOS, resp)[0]!.candidato.id).toBe('ferrugem')
  })
})

describe('confiança', () => {
  it('é baixa sem respostas e alta com um vencedor folgado', () => {
    expect(confianca(classificar(CANDIDATOS, {}))).toBe('baixa')
    expect(confianca(classificar(CANDIDATOS, { onde: 'haste_raiz', mofo: 'algodao', raiz: 'mofo_branco', terreno: 'reboleira' }))).toBe('alta')
  })
  it('não encerra sem nenhuma resposta', () => {
    expect(podeEncerrar(classificar(CANDIDATOS, {}), 0, false)).toBe(false)
  })
})
