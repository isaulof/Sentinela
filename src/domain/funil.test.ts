import { describe, expect, it } from 'vitest'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { ICONES } from '@/ui/components/iconPaths'
import { classificar, confianca, explicar, fatorFenologico, ganhoDaPergunta, podeEncerrar, possibilidadesRestantes, progresso, proximaPergunta, ROTULO_CONFIANCA, validarBase, type Candidato, type PerguntaFunil } from './funil'

describe('base de conhecimento do guia', () => {
  it('é íntegra: perfis citam só perguntas e opções que existem', () => {
    expect(validarBase(PERGUNTAS, CANDIDATOS)).toEqual([])
  })
  it('todo ícone das opções existe no conjunto do app e cada bicho tem o seu', () => {
    for (const p of PERGUNTAS) for (const o of p.opcoes) if (o.icone) expect(ICONES, `${p.id}/${o.id}`).toContain(o.icone)
    const bicho = PERGUNTAS.find((p) => p.id === 'bicho')!
    const icones = bicho.opcoes.filter((o) => !['nao_sei', 'nenhum'].includes(o.id)).map((o) => o.icone)
    expect(new Set(icones).size).toBe(icones.length) // nenhum ícone repetido entre os bichos
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
    expect(classificar(CANDIDATOS, { onde: 'folha_cor', mancha: 'nenhuma', bicho: 'nenhum', terreno: 'faixas' })[0]!.candidato.id).toMatch(/^herb_/)
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

const porId = (id: string) => CANDIDATOS.find((c) => c.id === id)!
const compatDe = (id: string, r: Record<string, string>, estadio?: string) => classificar(CANDIDATOS, r, { estadio }).find((x) => x.candidato.id === id)!.compat

describe('fase da lavoura (estádio) como contexto', () => {
  it('sem janela, sem estádio ou com estádio inválido, não interfere', () => {
    expect(fatorFenologico(porId('oidio'), 'R3')).toBe(1)
    expect(fatorFenologico(porId('percevejo'), undefined)).toBe(1)
    expect(fatorFenologico(porId('percevejo'), 'XX')).toBe(1)
  })
  it('dentro da janela vale 1; fora, cai com a distância, sem zerar', () => {
    expect(fatorFenologico(porId('percevejo'), 'R5')).toBe(1) // janela R3–R7
    expect(fatorFenologico(porId('percevejo'), 'R2')).toBe(0.7) // uma fase antes
    expect(fatorFenologico(porId('percevejo'), 'R1')).toBe(0.4)
    expect(fatorFenologico(porId('percevejo'), 'V4')).toBe(0.15)
    expect(fatorFenologico(porId('percevejo'), 'R8')).toBe(0.7)
  })
  it('V13 em diante conta como fim do vegetativo, sem quebrar', () => {
    expect(fatorFenologico(porId('ferrugem'), 'V15')).toBe(1) // janela V6–R6 inclui o fim do vegetativo
  })
  it('percevejo em lavoura ainda sem vagens perde compatibilidade; em R5 não', () => {
    const r = { onde: 'vagem', bicho: 'percevejo' }
    expect(compatDe('percevejo', r, 'V4')).toBeLessThan(compatDe('percevejo', r, 'R5'))
  })
  it('sem estádio, o resultado é o mesmo de antes', () => {
    const r = { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo' }
    expect(classificar(CANDIDATOS, r).map((x) => x.compat)).toEqual(classificar(CANDIDATOS, r, {}).map((x) => x.compat))
  })
  it('as compatibilidades continuam somando 1 com o contexto', () => {
    expect(classificar(CANDIDATOS, { onde: 'folha_mancha' }, { estadio: 'R2' }).reduce((a, x) => a + x.compat, 0)).toBeCloseTo(1, 9)
  })
})

describe('o que aconteceu nos últimos dias', () => {
  it('produto aplicado + amarelo + faixas retas → efeito de produto', () => {
    expect(classificar(CANDIDATOS, { onde: 'folha_cor', mancha: 'nenhuma', bicho: 'nenhum', recente: 'produto' })[0]!.candidato.id).toMatch(/^herb_/)
  })
  it('chuva com granizo + manchas de cantos retos → bacteriose', () => {
    expect(classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'angular', recente: 'chuva_forte' })[0]!.candidato.id).toBe('bacteriose')
  })
  it('tempo seco e quente + planta murcha com raiz normal → estresse', () => {
    expect(classificar(CANDIDATOS, { onde: 'murcha', raiz: 'normal', recente: 'seco' })[0]!.candidato.id).toBe('estresse')
  })
  it('"nada de diferente" não favorece nenhuma causa', () => {
    const a = classificar(CANDIDATOS, { onde: 'folha_mancha' })
    const b = classificar(CANDIDATOS, { onde: 'folha_mancha', recente: 'nada' })
    expect(b.map((x) => x.candidato.id)).toEqual(a.map((x) => x.candidato.id))
    b.forEach((x, i) => expect(x.compat).toBeCloseTo(a[i]!.compat, 9))
  })
})

describe('explicar o resultado', () => {
  const resp = { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo', bicho: 'percevejo', recente: 'nada' }
  it('separa o que combina do que não combina, na ordem de relevância', () => {
    const e = explicar(porId('ferrugem'), PERGUNTAS, resp)
    expect(e.combina.map((l) => l.resposta)).toContain('Pontinhos ou pústulas por baixo')
    expect(e.combina[0]!.frequencia).toBe('tipico')
    expect(e.naoCombina.map((l) => l.resposta)).toContain('Bicho achatado, em forma de escudo')
  })
  it('respostas neutras e puladas ficam de fora', () => {
    const e = explicar(porId('ferrugem'), PERGUNTAS, resp)
    const todas = [...e.combina, ...e.naoCombina].map((l) => l.resposta)
    expect(todas).not.toContain('Nada de diferente')
    expect(explicar(porId('ferrugem'), PERGUNTAS, {}).combina).toEqual([])
  })
})

describe('progresso e confiança em palavras', () => {
  it('começa em 0, cresce a cada resposta útil e nunca passa de 1', () => {
    const p0 = progresso(CANDIDATOS, {})
    const p1 = progresso(CANDIDATOS, { onde: 'folha_mancha' })
    const p2 = progresso(CANDIDATOS, { onde: 'folha_mancha', mancha: 'pustula' })
    expect(p0).toBe(0)
    expect(p1).toBeGreaterThan(p0)
    expect(p2).toBeGreaterThan(p1)
    expect(p2).toBeLessThanOrEqual(1)
  })
  it('as possibilidades restantes diminuem conforme se responde', () => {
    const n0 = possibilidadesRestantes(classificar(CANDIDATOS, {}))
    const n2 = possibilidadesRestantes(classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'pustula' }))
    expect(n0).toBe(CANDIDATOS.length)
    expect(n2).toBeLessThan(n0)
    expect(n2).toBeGreaterThanOrEqual(1)
  })
  it('a confiança tem rótulo sem porcentagem', () => {
    expect(ROTULO_CONFIANCA).toEqual({ alta: 'Bem provável', media: 'Provável', baixa: 'Ainda incerto' })
  })
})

describe('janelas de estádio na base', () => {
  it('são válidas e só existem onde faz sentido agronômico declarado', () => {
    expect(validarBase(PERGUNTAS, CANDIDATOS)).toEqual([])
    expect(CANDIDATOS.filter((c) => c.janela).map((c) => c.id).sort()).toEqual(['anticarsia', 'dfc', 'elasmo', 'ferrugem', 'lagarta', 'lagarta_vagem', 'mofo', 'percevejo', 'percevejo_pequeno', 'percevejo_verde'])
  })
  it('janela invertida é detectada', () => {
    expect(validarBase(PERGUNTAS, [{ ...CANDIDATOS[0]!, janela: ['R5', 'R1'] }]).join('|')).toMatch(/janela de estádios inválida/)
  })
})
