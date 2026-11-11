import { describe, expect, it } from 'vitest'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { MAX_DETALHES_INCERTO, proximoPasso, TRIAGEM, type EstadoFluxo } from './fluxo'
import { nichoDe, APLICACAO_RECENTE, RAMOS_DO_NICHO_APLICACAO, paraRamo, ramoDe, classificar, contarEvidencias, dispensada, percentual, porGrupo, RAMOS, TETO_PCT, veredito, VEROSSIMILHANCA, type EscolhaFoto, type Respostas } from './funil'

interface Caso { id: string; resp: Record<string, string>; estadio?: string }

/** O que um usuário atento responderia ao ver cada problema "de livro". */
const OURO: Caso[] = [
  { id: 'herb_hormonal', estadio: 'V5', resp: { onde: 'folha_cor', terreno: 'faixas', recente: 'produto', herb_grupo: 'hormonal', tempo_apos: 'dias_4_10', folhas_novas: 'tambem', desenho_aplic: 'borda_vento', condicao_aplic: 'vento', cor_amarelo: 'deformada', altura: 'topo', evolucao: 'de_uma_vez' } },
  { id: 'herb_contato', estadio: 'V5', resp: { onde: 'folha_mancha', terreno: 'faixas', recente: 'produto', herb_grupo: 'pos_soja', tempo_apos: 'dias_1_3', folhas_novas: 'sadias', desenho_aplic: 'faixas_barra', condicao_aplic: 'normal', mancha: 'queimado', evolucao: 'de_uma_vez' } },
  { id: 'herb_als', estadio: 'V3', resp: { onde: 'folha_cor', terreno: 'reboleira', recente: 'produto', herb_grupo: 'safra_anterior', tempo_apos: 'desde_inicio', folhas_novas: 'tambem', desenho_aplic: 'manchas', condicao_aplic: 'normal', cor_amarelo: 'arroxeado', altura: 'toda', evolucao: 'parado' } },
  { id: 'calda', estadio: 'R2', resp: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'calda', tempo_apos: 'dias_1_3', folhas_novas: 'sadias', desenho_aplic: 'sem_desenho', condicao_aplic: 'quente', mistura: 'sim', mancha: 'queimado', evolucao: 'de_uma_vez' } },
  { id: 'adubo_queima', estadio: 'V6', resp: { onde: 'folha_mancha', terreno: 'faixas', recente: 'adubo', tempo_apos: 'dias_1_3', folhas_novas: 'sadias', desenho_aplic: 'faixas_barra', mancha: 'queimado', evolucao: 'de_uma_vez' } },
  { id: 'def_mn', estadio: 'V6', resp: { onde: 'folha_cor', terreno: 'reboleira', recente: 'produto', herb_grupo: 'dessecacao', tempo_apos: 'mais_10', folhas_novas: 'tambem', desenho_aplic: 'manchas', condicao_aplic: 'normal', cor_amarelo: 'entre_nervuras', altura: 'topo', evolucao: 'parado' } },
  { id: 'ferrugem', estadio: 'R3', resp: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'umido', mancha: 'pustula', altura: 'baixo', face_baixo: 'pustulas', evolucao: 'espalhando' } },
  { id: 'manchaalvo', estadio: 'R2', resp: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'umido', mancha: 'alvo', altura: 'meio', face_baixo: 'igual', evolucao: 'espalhando' } },
  { id: 'oidio', estadio: 'R2', resp: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'seco', mancha: 'po_branco', face_baixo: 'po', evolucao: 'espalhando' } },
  { id: 'bacteriose', estadio: 'V6', resp: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'chuva_forte', mancha: 'angular', face_baixo: 'igual', evolucao: 'de_uma_vez' } },
  { id: 'def_k', estadio: 'R3', resp: { onde: 'folha_cor', terreno: 'uniforme', recente: 'seco', cor_amarelo: 'bordas', altura: 'baixo', evolucao: 'espalhando', bicho: 'nenhum', raiz: 'normal' } },
  { id: 'def_mg', estadio: 'R1', resp: { onde: 'folha_cor', terreno: 'reboleira', recente: 'nada', cor_amarelo: 'entre_nervuras', altura: 'baixo', evolucao: 'parado', bicho: 'nenhum', raiz: 'normal' } },
  { id: 'def_mn', estadio: 'V6', resp: { onde: 'folha_cor', terreno: 'reboleira', recente: 'produto', cor_amarelo: 'entre_nervuras', altura: 'topo', evolucao: 'parado', bicho: 'nenhum', raiz: 'normal' } },
  { id: 'mofo', estadio: 'R2', resp: { onde: 'haste_raiz', terreno: 'reboleira', recente: 'umido', mofo: 'algodao', raiz: 'mofo_branco' } },
  { id: 'nematoide', estadio: 'R1', resp: { onde: 'murcha', terreno: 'reboleira', recente: 'nada', raiz: 'galhas', mofo: 'nada', altura: 'toda', evolucao: 'espalhando' } },
  { id: 'percevejo', estadio: 'R5', resp: { onde: 'vagem', terreno: 'uniforme', recente: 'nada', bicho: 'percevejo', tamanho: 'medio', cor_bicho: 'marrom', faixa_costas: 'sem_faixa', local_bicho: 'vagem', grao: 'chochas_manchadas', mofo: 'nada' } },
  { id: 'percevejo_verde', estadio: 'R5', resp: { onde: 'vagem', terreno: 'uniforme', recente: 'nada', bicho: 'percevejo', tamanho: 'grande', cor_bicho: 'verde', faixa_costas: 'sem_faixa', local_bicho: 'vagem', grao: 'chochas_manchadas', mofo: 'nada' } },
  { id: 'anticarsia', estadio: 'R1', resp: { onde: 'folha_comida', terreno: 'uniforme', recente: 'nada', bicho: 'lagarta', patas_barriga: 'varias', tamanho: 'grande', cor_bicho: 'listrado', andar: 'normal', local_bicho: 'folha_cima', dano: 'rendilhada', evolucao: 'espalhando' } },
  { id: 'lagarta', estadio: 'R1', resp: { onde: 'folha_comida', terreno: 'uniforme', recente: 'nada', bicho: 'lagarta', patas_barriga: 'poucas', tamanho: 'medio', cor_bicho: 'verde', andar: 'mede_palmo', local_bicho: 'folha_baixo', dano: 'rendilhada', evolucao: 'espalhando' } },
  { id: 'vaquinha', estadio: 'V6', resp: { onde: 'folha_comida', terreno: 'uniforme', recente: 'nada', bicho: 'besouro', besouro_tipo: 'manchas_pretas', sacudir: 'voa', tamanho: 'pequeno', cor_bicho: 'verde', local_bicho: 'folha_baixo', dano: 'furos', evolucao: 'espalhando' } },
  { id: 'acaro', estadio: 'R2', resp: { onde: 'folha_cor', terreno: 'reboleira', recente: 'seco', bicho: 'acaro', tamanho: 'minusculo', cor_bicho: 'branco', altura: 'toda', cor_amarelo: 'uniforme', evolucao: 'espalhando' } },
  { id: 'granizo', estadio: 'R2', resp: { onde: 'folha_comida', terreno: 'uniforme', recente: 'chuva_forte', dano: 'rasgada', evolucao: 'de_uma_vez', bicho: 'nenhum' } },
  { id: 'estresse', estadio: 'R3', resp: { onde: 'murcha', terreno: 'uniforme', recente: 'seco', raiz: 'normal', mofo: 'nada', altura: 'toda', evolucao: 'de_uma_vez' } },
]

interface Resultado { top: string; ranking: string[]; perguntas: string[]; fotos: EscolhaFoto[]; respostas: Respostas }

/** Simula um usuário que responde o que o mapa diz; pergunta que o mapa não cobre é "não consigo ver isso". */
function simular(resp: Record<string, string>, estadio: string | undefined, verdade: string | null): Resultado {
  const respostas: Record<string, string> = {}
  const puladas = new Set<string>()
  const fotos: EscolhaFoto[] = []
  const perguntas: string[] = []
  for (let i = 0; i < 30; i++) {
    const passo = proximoPasso(PERGUNTAS, CANDIDATOS, { respostas, puladas, fotos }, { estadio })
    if (passo.tipo === 'resultado') break
    if (passo.tipo === 'pergunta') {
      perguntas.push(passo.pergunta.id)
      const o = resp[passo.pergunta.id]
      if (o) respostas[passo.pergunta.id] = o
      else puladas.add(passo.pergunta.id)
    } else {
      const ids = passo.candidatos.map((c) => c.id)
      fotos.push({ mostrados: ids, escolhido: verdade && ids.includes(verdade) ? verdade : 'nao_sei' })
    }
  }
  const rank = classificar(CANDIDATOS, respostas, { estadio, perguntas: PERGUNTAS, fotos })
  return { top: rank[0]!.candidato.id, ranking: rank.map((r) => r.candidato.id), perguntas, fotos, respostas }
}

describe('casos de ouro: o fluxo completo acerta o problema "de livro"', () => {
  for (const c of OURO) {
    it(`${c.id}`, () => {
      const r = simular(c.resp, c.estadio, c.id)
      expect(r.top).toBe(c.id)
    })
  }
  it('cada caso de ouro é um candidato que existe', () => {
    const ids = new Set(CANDIDATOS.map((c) => c.id))
    for (const c of OURO) expect(ids.has(c.id)).toBe(true)
  })
})

describe('mutação: um erro do leigo não tira a causa certa do top-3', () => {
  for (const c of OURO) {
    it(`${c.id}`, () => {
      const base = simular(c.resp, c.estadio, c.id)
      // troca, uma por vez, cada resposta efetivamente dada pelo caso por outra opção da mesma pergunta (exceto a abertura "onde")
      for (const q of Object.keys(base.respostas).filter((x) => x !== 'onde')) {
        const pergunta = PERGUNTAS.find((p) => p.id === q)!
        for (const o of pergunta.opcoes) {
          if (o.id === c.resp[q]) continue
          if (o.id === 'nao_sei') continue // "não sei" tira informação, não é resposta errada
          // Quem aplicou algo pode confundir herbicida, fungicida e adubo; já "não apliquei nada" é outra história.
          if (q === 'recente' && APLICACAO_RECENTE.includes(c.resp[q] ?? '') && !APLICACAO_RECENTE.includes(o.id)) continue
          // "Incompatível" é exclusão por definição (ex.: mofo branco na raiz não é galha): não é erro plausível de leigo.
          if (CANDIDATOS.find((x) => x.id === c.id)!.perfil[q]?.[o.id] === 'incompativel') continue
          const r = simular({ ...c.resp, [q]: o.id }, c.estadio, c.id)
          expect(r.ranking.slice(0, 3), `${c.id}: erro em ${q}=${o.id}`).toContain(c.id)
        }
      }
    })
  }
})

describe('estrutura do fluxo', () => {
  it('a triagem vem sempre primeiro, na mesma ordem, antes de qualquer detalhe', () => {
    const r = simular(OURO.find((c) => c.id === 'ferrugem')!.resp, 'R3', null)
    expect(r.perguntas.slice(0, 3)).toEqual([...TRIAGEM])
  })
  it('depois da triagem só entram perguntas do ramo escolhido', () => {
    const r = simular(OURO.find((c) => c.id === 'ferrugem')!.resp, 'R3', null) // folha_mancha
    for (const id of r.perguntas.slice(3)) {
      const p = PERGUNTAS.find((x) => x.id === id)!
      expect(p.ramos, id).toContain('folha_mancha')
    }
  })
  it('nunca passa do máximo de perguntas de detalhe e nunca repete pergunta', () => {
    for (const c of OURO) {
      const r = simular(c.resp, c.estadio, null)
      expect(r.perguntas.length).toBeLessThanOrEqual(TRIAGEM.length + MAX_DETALHES_INCERTO)
      expect(new Set(r.perguntas).size).toBe(r.perguntas.length)
    }
  })
  it('mostra a comparação por fotos antes do resultado, com pelo menos 2 candidatos', () => {
    const e: EstadoFluxo = { respostas: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'umido', mancha: 'pustula', altura: 'baixo', face_baixo: 'pustulas' }, puladas: new Set(), fotos: [] }
    const passo = proximoPasso(PERGUNTAS, CANDIDATOS, e)
    expect(passo.tipo).toBe('fotos')
    if (passo.tipo === 'fotos') expect(passo.candidatos.length).toBeGreaterThanOrEqual(2)
  })
  it('"nenhuma parece" abre uma segunda rodada com candidatos diferentes; depois encerra', () => {
    const base = { respostas: { onde: 'folha_mancha', terreno: 'uniforme', recente: 'umido', mancha: 'pustula', altura: 'baixo', face_baixo: 'pustulas' }, puladas: new Set<string>() }
    const p1 = proximoPasso(PERGUNTAS, CANDIDATOS, { ...base, fotos: [] })
    if (p1.tipo !== 'fotos') throw new Error('esperava fotos')
    const f1: EscolhaFoto = { mostrados: p1.candidatos.map((c) => c.id), escolhido: 'nenhuma' }
    const p2 = proximoPasso(PERGUNTAS, CANDIDATOS, { ...base, fotos: [f1] })
    expect(p2.tipo).toBe('fotos')
    if (p2.tipo === 'fotos') {
      expect(p2.rodada).toBe(2)
      expect(p2.candidatos.some((c) => f1.mostrados.includes(c.id))).toBe(false)
      const f2: EscolhaFoto = { mostrados: p2.candidatos.map((c) => c.id), escolhido: 'nenhuma' }
      expect(proximoPasso(PERGUNTAS, CANDIDATOS, { ...base, fotos: [f1, f2] }).tipo).toBe('resultado')
    }
  })
  it('"ver resultado agora" encerra, mas só com pelo menos uma resposta', () => {
    expect(proximoPasso(PERGUNTAS, CANDIDATOS, { respostas: {}, puladas: new Set(), fotos: [], encerrar: true }).tipo).toBe('pergunta')
    expect(proximoPasso(PERGUNTAS, CANDIDATOS, { respostas: { onde: 'vagem' }, puladas: new Set(), fotos: [], encerrar: true }).tipo).toBe('resultado')
  })
})

describe('foto como evidência e peso da pergunta', () => {
  const resp = { onde: 'folha_mancha', mancha: 'pardas' }
  it('escolher a foto de uma causa aumenta a compatibilidade dela; "nenhuma" a reduz', () => {
    const sem = classificar(CANDIDATOS, resp, {}).find((r) => r.candidato.id === 'dfc')!.compat
    const com = classificar(CANDIDATOS, resp, { fotos: [{ mostrados: ['dfc', 'ferrugem'], escolhido: 'dfc' }] }).find((r) => r.candidato.id === 'dfc')!.compat
    const nenhuma = classificar(CANDIDATOS, resp, { fotos: [{ mostrados: ['dfc', 'ferrugem'], escolhido: 'nenhuma' }] }).find((r) => r.candidato.id === 'dfc')!.compat
    expect(com).toBeGreaterThan(sem)
    expect(nenhuma).toBeLessThan(sem)
  })
  it('"não sei" na foto não muda nada', () => {
    const a = classificar(CANDIDATOS, resp, {})
    const b = classificar(CANDIDATOS, resp, { fotos: [{ mostrados: ['dfc', 'ferrugem'], escolhido: 'nao_sei' }] })
    expect(b.map((x) => x.compat)).toEqual(a.map((x) => x.compat))
  })
  it('a foto sozinha não decide: contra duas respostas fortes, ela não vira o resultado', () => {
    const r = classificar(CANDIDATOS, { onde: 'folha_mancha', mancha: 'pustula', altura: 'baixo', face_baixo: 'pustulas' }, { fotos: [{ mostrados: ['manchaalvo', 'ferrugem'], escolhido: 'manchaalvo' }] })
    expect(r[0]!.candidato.id).toBe('ferrugem')
  })
  it('pergunta menos confiável pesa menos: o efeito de uma resposta encolhe com a confiabilidade', () => {
    const forte = PERGUNTAS.map((p) => (p.id === 'cor_amarelo' ? { ...p, confiabilidade: 1 } : p))
    const fraca = PERGUNTAS.map((p) => (p.id === 'cor_amarelo' ? { ...p, confiabilidade: 0.3 } : p))
    const r = { onde: 'folha_cor', cor_amarelo: 'entre_nervuras' }
    const compat = (ps: typeof PERGUNTAS) => classificar(CANDIDATOS, r, { perguntas: ps }).find((x) => x.candidato.id === 'def_mg')!.compat
    expect(compat(fraca)).toBeLessThan(compat(forte))
  })
})

describe('percentual de certeza', () => {
  it('nunca passa de 95% e cresce com a evidência', () => {
    expect(percentual(1, 20)).toBe(TETO_PCT)
    expect(percentual(0.99, 3)).toBeLessThan(percentual(0.99, 8))
  })
  it('poucas respostas nunca dão número alto, mesmo com compatibilidade máxima', () => {
    expect(percentual(1, 3)).toBeLessThanOrEqual(61)
  })
  it('conta respostas e fotos escolhidas, não as puladas nem o "não sei"', () => {
    expect(contarEvidencias({ a: '1', b: '2' }, [{ mostrados: ['x'], escolhido: 'x' }, { mostrados: ['y'], escolhido: 'nao_sei' }])).toBe(3)
  })
  it('a divisão viva × não viva soma 100 e respeita o teto', () => {
    const g = porGrupo(classificar(CANDIDATOS, { onde: 'folha_cor', terreno: 'faixas', recente: 'produto' }), 3)
    expect(g.viva + g.naoViva).toBe(100)
    expect(g.naoViva).toBeGreaterThan(g.viva)
    const extremo = porGrupo(classificar(CANDIDATOS, { onde: 'murcha', raiz: 'galhas', terreno: 'reboleira', mancha: 'pustula' }), 20)
    expect(extremo.viva).toBeLessThanOrEqual(TETO_PCT)
    expect(extremo.naoViva).toBeGreaterThanOrEqual(100 - TETO_PCT)
  })
})

describe('auditoria do fluxo: nenhum ramo fica sem perguntas que separem as causas', () => {
  const doRamo = (r: (typeof RAMOS)[number]) => PERGUNTAS.filter((p) => !(TRIAGEM as readonly string[]).includes(p.id) && (!p.ramos || p.ramos.includes(r)))
  for (const r of RAMOS) {
    it(`ramo ${r}: tem pelo menos 4 perguntas além da triagem`, () => {
      expect(doRamo(r).length).toBeGreaterThanOrEqual(4)
    })
    it(`ramo ${r}: toda dupla de causas plausíveis pode ser separada por alguma pergunta`, () => {
      const qs = [...PERGUNTAS.filter((p) => p.id !== 'onde' && (TRIAGEM as readonly string[]).includes(p.id)), ...doRamo(r)]
      const cands = CANDIDATOS.filter((c) => ['tipico', 'comum', 'possivel'].includes(c.perfil['onde']?.[r] ?? ''))
      const inseparaveis: string[] = []
      for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
        const a = cands[i]!, b = cands[j]!
        const separa = qs.some((p) => p.opcoes.some((o) => {
          const x = VEROSSIMILHANCA[a.perfil[p.id]?.[o.id] ?? 'possivel']
          const y = VEROSSIMILHANCA[b.perfil[p.id]?.[o.id] ?? 'possivel']
          return Math.max(x, y) / Math.min(x, y) >= 3
        }))
        if (!separa) inseparaveis.push(`${a.id} × ${b.id}`)
      }
      expect(inseparaveis).toEqual([])
    })
  }
})

describe('não dar nome ao problema sem base', () => {
  it('só dizer "percevejo", sem confirmar nada, não dá diagnóstico: pergunta mais e termina inconclusivo', () => {
    // Quem só sabe que é "um bicho" e não consegue responder o resto (asas, antenas, patas, tamanho, cor...).
    const r = simular({ onde: 'bicho', terreno: 'isoladas', recente: 'nada', bicho: 'percevejo' }, 'R4', null)
    expect(r.perguntas.length).toBeGreaterThanOrEqual(TRIAGEM.length + 4) // perguntou as características antes de parar
    const rank = classificar(CANDIDATOS, r.respostas, { estadio: 'R4', perguntas: PERGUNTAS, fotos: r.fotos })
    expect(veredito(rank, contarEvidencias(r.respostas, r.fotos))).toBe('inconclusivo')
  })
  it('escolher "nenhuma" nas fotos não deixa o resultado mais seguro', () => {
    const resp = { onde: 'bicho', terreno: 'isoladas', recente: 'nada', bicho: 'percevejo' }
    const sem = classificar(CANDIDATOS, resp, { estadio: 'R4', perguntas: PERGUNTAS })
    const ids = sem.slice(0, 3).map((x) => x.candidato.id)
    const com = classificar(CANDIDATOS, resp, { estadio: 'R4', perguntas: PERGUNTAS, fotos: [{ mostrados: ids, escolhido: 'nenhuma' }] })
    expect(com[0]!.compat).toBeLessThanOrEqual(sem[0]!.compat + 1e-9)
  })
  it('já confirmando tamanho, cor, faixa e onde estava, o percevejo-marrom é nomeado', () => {
    const resp = { onde: 'bicho', terreno: 'isoladas', recente: 'nada', bicho: 'percevejo', tamanho: 'medio', cor_bicho: 'marrom', faixa_costas: 'sem_faixa', local_bicho: 'vagem' }
    const r = simular(resp, 'R5', 'percevejo')
    expect(r.top).toBe('percevejo')
    const rank = classificar(CANDIDATOS, r.respostas, { estadio: 'R5', perguntas: PERGUNTAS, fotos: r.fotos })
    expect(veredito(rank, contarEvidencias(r.respostas, r.fotos))).not.toBe('inconclusivo')
  })
  it('perguntas de bicho não aparecem para quem disse que não viu bicho nenhum', () => {
    const r = simular({ onde: 'folha_cor', terreno: 'uniforme', recente: 'seco', bicho: 'nenhum' }, 'R3', null)
    for (const q of ['asas', 'antenas', 'patas', 'tamanho', 'cor_bicho', 'andar', 'local_bicho']) expect(r.perguntas).not.toContain(q)
  })
  it('veredito: sem respostas é inconclusivo; evidência forte é "definido"; nunca nomeia com menos de 50%', () => {
    expect(veredito(classificar(CANDIDATOS, {}), 0)).toBe('inconclusivo')
    const forte = classificar(CANDIDATOS, { onde: 'haste_raiz', mofo: 'algodao', raiz: 'mofo_branco', terreno: 'reboleira', dentro_haste: 'pontos_pretos' }, { perguntas: PERGUNTAS })
    expect(veredito(forte, 8)).toBe('definido')
    expect(veredito(forte, 1)).toBe('inconclusivo') // pouca evidência: o teto do percentual fica abaixo de 50%
  })
})

describe('cada tipo de bicho segue a sua própria linha de perguntas', () => {
  /** Perguntas que o fluxo ainda pode fazer no ramo "bicho" depois de a pessoa escolher a que o bicho se parece. */
  const apos = (bicho: string) => PERGUNTAS.filter((p) => !(TRIAGEM as readonly string[]).includes(p.id) && p.id !== 'bicho' && (!p.ramos || p.ramos.includes('bicho')) && !dispensada(p, { onde: 'bicho', bicho }))
  const ids = (b: string) => apos(b).map((p) => p.id)

  it('lagarta: pergunta como anda e as patinhas, não asas nem antenas', () => {
    expect(ids('lagarta')).toEqual(expect.arrayContaining(['andar', 'patas_barriga', 'tamanho', 'cor_bicho', 'local_bicho']))
    for (const q of ['asas', 'antenas', 'patas', 'besouro_tipo', 'sacudir', 'faixa_costas', 'larva_dano']) expect(ids('lagarta')).not.toContain(q)
  })
  it('besouro: pergunta o desenho e o que acontece ao balançar, não como anda', () => {
    expect(ids('besouro')).toEqual(expect.arrayContaining(['besouro_tipo', 'sacudir', 'tamanho', 'cor_bicho']))
    for (const q of ['andar', 'patas_barriga', 'asas', 'antenas', 'faixa_costas']) expect(ids('besouro')).not.toContain(q)
  })
  it('larva: pergunta o que fez na planta, não asas nem cor de lagarta', () => {
    expect(ids('larva')).toEqual(expect.arrayContaining(['larva_dano', 'tamanho', 'local_bicho']))
    for (const q of ['asas', 'antenas', 'andar', 'besouro_tipo', 'sacudir']) expect(ids('larva')).not.toContain(q)
  })
  it('bicho em escudo (percevejo): pergunta a faixa nas costas', () => {
    expect(ids('percevejo')).toEqual(expect.arrayContaining(['faixa_costas', 'tamanho', 'cor_bicho']))
    for (const q of ['andar', 'patas_barriga', 'besouro_tipo', 'sacudir']) expect(ids('percevejo')).not.toContain(q)
  })
  it('mosquinha ou pulgão: pergunta o que acontece ao balançar', () => {
    expect(ids('mosca_branca')).toEqual(expect.arrayContaining(['sacudir', 'tamanho', 'cor_bicho']))
    for (const q of ['andar', 'patas_barriga', 'faixa_costas']) expect(ids('mosca_branca')).not.toContain(q)
  })
  it('minúsculo (ácaro): não pergunta nada de lagarta, besouro nem percevejo', () => {
    for (const q of ['andar', 'patas_barriga', 'besouro_tipo', 'faixa_costas']) expect(ids('acaro')).not.toContain(q)
  })
  it('"não consigo identificar": pergunta a anatomia geral (asas, antenas, patas)', () => {
    expect(ids('nao_sei')).toEqual(expect.arrayContaining(['asas', 'antenas', 'patas', 'tamanho', 'cor_bicho', 'local_bicho']))
  })
  it('pular "a que o bicho se parece" depois de dizer que viu um bicho vale como "não consigo identificar"', () => {
    const r = simular({ onde: 'bicho', terreno: 'isoladas', recente: 'nada' }, 'R4', null)
    expect(r.perguntas).toEqual(expect.arrayContaining(['asas', 'antenas', 'patas']))
  })
  it('pular "viu algum bicho?" num problema de folha não puxa perguntas de anatomia', () => {
    const r = simular({ onde: 'folha_cor', terreno: 'uniforme', recente: 'nada' }, 'R3', null)
    for (const q of ['asas', 'antenas', 'patas', 'tamanho', 'cor_bicho', 'local_bicho', 'sacudir']) expect(r.perguntas).not.toContain(q)
  })
  for (const b of ['lagarta', 'besouro', 'larva', 'percevejo', 'mosca_branca', 'acaro', 'nao_sei']) {
    it(`caminho "${b}": toda dupla de causas possíveis é separável pelas perguntas desse caminho`, () => {
      const qs = [...PERGUNTAS.filter((p) => p.id !== 'onde' && (TRIAGEM as readonly string[]).includes(p.id)), ...apos(b)]
      const cands = CANDIDATOS.filter((c) => ['tipico', 'comum', 'possivel'].includes(c.perfil['onde']?.['bicho'] ?? '') && ['tipico', 'comum', 'possivel'].includes(c.perfil['bicho']?.[b] ?? (b === 'nao_sei' ? 'possivel' : '')))
      const ruins: string[] = []
      for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
        const a = cands[i]!, c = cands[j]!
        const separa = qs.some((p) => p.opcoes.some((o) => {
          const x = VEROSSIMILHANCA[a.perfil[p.id]?.[o.id] ?? 'possivel']
          const y = VEROSSIMILHANCA[c.perfil[p.id]?.[o.id] ?? 'possivel']
          return Math.max(x, y) / Math.min(x, y) >= 3
        }))
        if (!separa) ruins.push(`${a.id} × ${c.id}`)
      }
      expect(ruins).toEqual([])
    })
  }
})

describe('nicho de aplicação: quem aplicou algo recebe perguntas sobre o produto', () => {
  const livro = (id: string) => OURO.find((c) => c.id === id)!.resp
  const sequencia = (resp: Record<string, string>, estadio = 'V5') => simular(resp, estadio, null).perguntas.slice(3)
  const DOENCA_PRAGA = ['face_baixo', 'bicho', 'mofo', 'grao', 'dentro_haste', 'asas', 'antenas', 'patas', 'tamanho', 'cor_bicho', 'local_bicho', 'andar', 'sacudir', 'dano']

  const NICHO = (q: string) => PERGUNTAS.find((p) => p.id === q)!.nichos?.includes('aplicacao') ?? false
  const comecaPeloNicho = (resp: Record<string, string>) => {
    // Quem não sabe responder nada: ainda assim as primeiras perguntas são as do nicho.
    const { onde, terreno, recente } = resp
    return simular({ onde: onde!, terreno: terreno!, recente: recente! }, 'V5', null).perguntas.slice(3, 8)
  }

  it('herbicida: as perguntas são sobre o produto; nada de doença nem de bicho', () => {
    const seq = sequencia(livro('herb_hormonal'))
    expect(seq).toContain('herb_grupo')
    for (const q of DOENCA_PRAGA) expect(seq, q).not.toContain(q)
    const seco = comecaPeloNicho(livro('herb_hormonal'))
    expect(seco).toEqual(expect.arrayContaining(['herb_grupo', 'tempo_apos', 'folhas_novas']))
    for (const q of seco) expect(NICHO(q), q).toBe(true)
  })
  it('herbicida numa mancha de folha também não pergunta o que há embaixo da folha', () => {
    const seq = sequencia(livro('herb_contato'))
    expect(seq).not.toContain('face_baixo')
    for (const q of comecaPeloNicho(livro('herb_contato'))) expect(NICHO(q), q).toBe(true)
  })
  it('fungicida, inseticida ou mistura: pergunta a mistura, não o tipo de herbicida', () => {
    const seq = sequencia(livro('calda'))
    expect(seq).not.toContain('herb_grupo')
    for (const q of DOENCA_PRAGA) expect(seq, q).not.toContain(q)
    const seco = comecaPeloNicho(livro('calda'))
    expect(seco).toEqual(expect.arrayContaining(['tempo_apos', 'folhas_novas']))
    expect(seco).not.toContain('herb_grupo')
    const mistura = PERGUNTAS.find((p) => p.id === 'mistura')!
    expect(dispensada(mistura, { onde: 'folha_mancha', recente: 'calda' })).toBe(false) // a pergunta da mistura só vale para calda
    expect(dispensada(mistura, { onde: 'folha_mancha', recente: 'produto' })).toBe(true)
    expect(dispensada(mistura, { onde: 'folha_mancha', recente: 'adubo' })).toBe(true)
  })
  it('adubo: pergunta o tempo e as folhas novas, não o herbicida nem a mistura', () => {
    const resp = { ...livro('adubo_queima'), onde: 'folha_cor', cor_amarelo: 'bordas', altura: 'baixo' }
    const seq = sequencia(resp)
    for (const q of ['herb_grupo', 'mistura', 'condicao_aplic', ...DOENCA_PRAGA]) expect(seq, q).not.toContain(q)
    const seco = comecaPeloNicho(resp)
    expect(seco).toEqual(expect.arrayContaining(['tempo_apos', 'folhas_novas']))
    expect(seco).not.toContain('herb_grupo')
  })
  it('sem aplicação recente, as perguntas de produto nunca aparecem', () => {
    for (const rec of ['nada', 'seco', 'umido', 'chuva_forte']) {
      const seq = sequencia({ onde: 'folha_cor', terreno: 'uniforme', recente: rec })
      for (const q of ['herb_grupo', 'tempo_apos', 'folhas_novas', 'desenho_aplic', 'condicao_aplic', 'mistura']) expect(seq, `${rec}/${q}`).not.toContain(q)
    }
  })
  it('se o problema é um bicho, a aplicação não esconde as perguntas do bicho', () => {
    const r = simular({ onde: 'bicho', terreno: 'isoladas', recente: 'produto', bicho: 'lagarta' }, 'R3', null)
    expect(r.perguntas).toEqual(expect.arrayContaining(['andar', 'patas_barriga']))
    expect(r.perguntas).not.toContain('herb_grupo')
  })
  it('no nicho, toda dupla de causas plausíveis pode ser separada pelas perguntas do nicho', () => {
    for (const [ramo, rec] of [['folha_cor', 'produto'], ['folha_mancha', 'produto'], ['folha_mancha', 'calda'], ['folha_cor', 'adubo'], ['folha_mancha', 'adubo']] as const) {
      const resp = { onde: ramo, recente: rec }
      const qs = PERGUNTAS.filter((p) => p.id !== 'onde' && p.nichos?.includes('aplicacao') && !dispensada(p, resp) && (!p.ramos || p.ramos.includes(ramo)))
      const triagem = PERGUNTAS.filter((p) => p.id === 'terreno')
      const cands = CANDIDATOS.filter((c) => c.tipo === 'abiotico' && ['tipico', 'comum', 'possivel'].includes(c.perfil['onde']?.[ramo] ?? '') && ['tipico', 'comum', 'possivel'].includes(c.perfil['recente']?.[rec] ?? ''))
      const ruins: string[] = []
      for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) {
        const a = cands[i]!, b = cands[j]!
        const separa = [...qs, ...triagem].some((p) => p.opcoes.some((o) => {
          const x = VEROSSIMILHANCA[a.perfil[p.id]?.[o.id] ?? 'possivel']
          const y = VEROSSIMILHANCA[b.perfil[p.id]?.[o.id] ?? 'possivel']
          return Math.max(x, y) / Math.min(x, y) >= 3
        }))
        if (!separa) ruins.push(`${a.id} × ${b.id}`)
      }
      expect(ruins, `${ramo}/${rec}`).toEqual([])
    }
  })
})

describe('ancoragem: toda pergunta nasce de uma resposta anterior e faz sentido onde aparece', () => {
  const triagem = TRIAGEM as readonly string[]
  const porId = (id: string) => PERGUNTAS.find((p) => p.id === id)!

  it('toda pergunta fora da triagem declara em quais ramos vale', () => {
    for (const p of PERGUNTAS.filter((q) => !triagem.includes(q.id) && q.id !== 'onde')) expect(p.ramos?.length, p.id).toBeGreaterThan(0)
  })
  it('pergunta ancorada em outra (requer/so) só vale nos ramos em que a âncora também é feita', () => {
    for (const p of PERGUNTAS) {
      const ancoras = [...(p.requer ?? []), ...Object.keys(p.so ?? {})]
      for (const a of ancoras) {
        const ramosAncora = porId(a).ramos
        if (!ramosAncora) continue
        for (const r of p.ramos ?? []) expect(ramosAncora, `${p.id} vale em "${r}", mas a âncora "${a}" não é feita lá`).toContain(r)
      }
    }
  })
  it('perguntas do nicho de aplicação só valem nos ramos do nicho', () => {
    for (const p of PERGUNTAS.filter((q) => q.nichos?.includes('aplicacao') && Object.keys(q.so ?? {}).includes('recente'))) {
      for (const r of p.ramos ?? []) expect(RAMOS_DO_NICHO_APLICACAO, `${p.id}/${r}`).toContain(r)
    }
  })
  it('opções que não fazem sentido no ramo não são oferecidas', () => {
    expect(paraRamo(porId('bicho'), 'bicho').opcoes.map((o) => o.id)).not.toContain('nenhum')
    expect(paraRamo(porId('bicho'), 'folha_cor').opcoes.map((o) => o.id)).toContain('nenhum')
    for (const r of ['bicho', 'folha_comida', 'vagem'] as const) expect(paraRamo(porId('recente'), r).opcoes.map((o) => o.id)).not.toEqual(expect.arrayContaining(['produto']))
    expect(paraRamo(porId('recente'), 'folha_cor').opcoes.map((o) => o.id)).toEqual(expect.arrayContaining(['produto', 'calda', 'adubo']))
  })

  /** Caminhos aleatórios (semente fixa): responde qualquer opção oferecida, às vezes pula, e confere o sentido de cada pergunta. */
  it('em milhares de caminhos aleatórios, nenhuma pergunta aparece fora de lugar', () => {
    let seed = 20261111
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    const vistas = new Set<string>()
    for (let w = 0; w < 1500; w++) {
      const respostas: Record<string, string> = {}
      const puladas = new Set<string>()
      const fotos: EscolhaFoto[] = []
      const feitas: string[] = []
      for (let i = 0; i < 30; i++) {
        const passo = proximoPasso(PERGUNTAS, CANDIDATOS, { respostas, puladas, fotos }, { estadio: 'R3' })
        if (passo.tipo === 'resultado') break
        if (passo.tipo === 'fotos') { fotos.push({ mostrados: passo.candidatos.map((c) => c.id), escolhido: 'nao_sei' }); continue }
        const q = passo.pergunta
        const ctx = `${q.id} depois de ${JSON.stringify(respostas)}`
        const ramo = ramoDe(respostas)
        vistas.add(q.id)
        expect(feitas, `repetida: ${ctx}`).not.toContain(q.id)
        feitas.push(q.id)
        // ramo certo
        if (ramo && q.ramos) expect(q.ramos, `ramo: ${ctx}`).toContain(ramo)
        // âncoras satisfeitas
        for (const a of q.requer ?? []) expect(a in respostas || puladas.has(a), `âncora ${a}: ${ctx}`).toBe(true)
        for (const [a, ops] of Object.entries(q.so ?? {})) {
          const r = respostas[a] ?? (puladas.has('bicho') && respostas['onde'] === 'bicho' && a === 'bicho' ? 'nao_sei' : undefined)
          expect(r !== undefined && ops.includes(r), `so ${a}: ${ctx}`).toBe(true)
        }
        // não repete o que a resposta anterior já disse
        if (q.id === 'face_baixo') expect(respostas['mancha'], ctx).not.toBe('pustula')
        // nenhuma opção contraditória com o que já foi dito
        const ids = q.opcoes.map((o) => o.id)
        if (q.id === 'bicho' && ramo === 'bicho') expect(ids, ctx).not.toContain('nenhum')
        if (q.id === 'recente' && ramo && ['bicho', 'folha_comida', 'vagem'].includes(ramo)) for (const o of ['produto', 'adubo']) expect(ids, ctx).not.toContain(o)
        // perguntas de produto só com aplicação, no ramo do nicho
        if (q.nichos?.includes('aplicacao') && Object.keys(q.so ?? {}).includes('recente')) expect(nichoDe(respostas), ctx).toBe('aplicacao')
        if (rnd() < 0.08) puladas.add(q.id)
        else respostas[q.id] = ids[Math.floor(rnd() * ids.length)]!
      }
      expect(feitas.filter((q) => !triagem.includes(q)).length, 'detalhes').toBeLessThanOrEqual(MAX_DETALHES_INCERTO)
    }
    // toda pergunta é alcançável: não sobra pergunta órfã
    const orfas = PERGUNTAS.map((p) => p.id).filter((id) => !vistas.has(id))
    expect(orfas).toEqual([])
  }, 60_000)
})
