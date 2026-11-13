import { describe, expect, it } from 'vitest'
import { NIVEL_ACAO } from '@/domain/decision'
import { ALVOS, LISTA_ALVOS, type AlvoId } from './alvos'
import { ALVO_DO_CANDIDATO, ALVOS_SO_NA_BIBLIOTECA, AVISO_QUIMICO, FICHAS, type Fato, type Ficha } from './biblioteca'
import { CANDIDATOS } from './diagnostico'
import { FONTES } from './fontes'

const fatosDe = (f: Ficha): Fato[] => [f.classificacao, ...f.dano, ...f.reconhecer, ...f.favorecem, ...f.monitorar, ...f.niveis, ...f.cuidados, ...Object.values(f.manejo).flat()]
const todosOsTextos = (f: Ficha) => [...fatosDe(f).map((x) => x.texto), ...f.lacunas]

describe('fichas completas da Biblioteca', () => {
  it('todo alvo do registro tem a sua ficha, e a ficha aponta para o próprio alvo', () => {
    for (const a of LISTA_ALVOS) expect(FICHAS[a.id], a.id).toBeDefined()
    for (const [id, f] of Object.entries(FICHAS)) expect(f.alvo, id).toBe(id)
    expect(Object.keys(FICHAS).sort()).toEqual(LISTA_ALVOS.map((a) => a.id).sort())
  })
  it('todo fato tem texto e pelo menos uma fonte que existe', () => {
    for (const [id, f] of Object.entries(FICHAS)) {
      for (const x of fatosDe(f)) {
        expect(x.texto.length, `${id}: ${x.texto}`).toBeGreaterThan(15)
        expect(x.fontes.length, `${id}: ${x.texto}`).toBeGreaterThanOrEqual(1)
        for (const s of x.fontes) expect(FONTES[s], `${id} fonte ${s}`).toBeDefined()
      }
    }
  })
  it('cada ficha diz o que a Embrapa não publica quando falta nível de ação ou medida (nada é inventado para preencher)', () => {
    for (const [id, f] of Object.entries(FICHAS)) {
      const vazia = f.niveis.length === 0 || Object.keys(f.manejo).length === 0
      if (vazia) expect(f.lacunas.length, id).toBeGreaterThanOrEqual(1)
    }
  })
  it('o que é "da equipe" não é passado como da Embrapa: fato só da fonte "projeto" é permitido, mas misturado ele mostra as duas', () => {
    for (const f of Object.values(FICHAS)) for (const x of fatosDe(f)) if (x.fontes.includes('projeto')) expect(FONTES.projeto.tipo).toBe('projeto')
  })

  it('os níveis escritos nas fichas são os mesmos que o motor de decisão usa', () => {
    const t = (id: AlvoId) => fatosDe(FICHAS[id]).map((x) => x.texto).join(' ')
    expect(t('percevejo')).toContain(`${NIVEL_ACAO.percevejo.graos} percevejos por metro`)
    expect(t('percevejo')).toContain(`${NIVEL_ACAO.percevejo.sementes} percevejo por metro`)
    expect(t('lagarta')).toContain(`${NIVEL_ACAO.lagartaPorMetro} lagartas`)
    expect(t('lagarta')).toContain(`${NIVEL_ACAO.desfolhaVegetativa}%`)
    expect(t('lagarta')).toContain(`${NIVEL_ACAO.desfolhaReprodutiva}%`)
    expect(t('anticarsia')).toContain(`${NIVEL_ACAO.lagartaPorMetro} lagartas`)
    expect(t('spodoptera')).toContain(`${NIVEL_ACAO.spodopteraPorMetro} lagartas por metro`)
    expect(t('helicoverpa')).toContain(`${NIVEL_ACAO.helicoverpaPorMetro.vegetativo} lagartas por metro`)
    expect(t('helicoverpa')).toContain(`${NIVEL_ACAO.helicoverpaPorMetro.reprodutivo} lagartas por metro`)
    expect(t('broca')).toContain(`${NIVEL_ACAO.brocaPlantasPct}%`)
    expect(t('tamandua')).toContain(`${NIVEL_ACAO.tamanduaAteV3} adulto por metro`)
    expect(t('tamandua')).toContain(`${NIVEL_ACAO.tamanduaV4aV6} adultos por metro`)
  })

  it('nenhuma ficha manda aplicar defensivo nem cita marca comercial ou dose', () => {
    const manda = /\b(aplique|aplicar agora|recomenda-se aplicar|pulverize)\b/i
    const marcas = /\b(Intacta|Curatis|Tróia|Pladius|Fusão|Absoluto|Agris|Previnil|Strides|Áureo|Iharol|Agefix|Tridium)\b/
    // Doses de produto (L/ha, g/ha, mL/100 L); as perdas de produtividade (kg por hectare) são dano, não dose.
    const dose = /\d\s?(mL|L)\s?(\/|por)\s?(ha|hectare|100\s?L)|\d\s?g\s?\/\s?(ha|100\s?L)|dose de \d/i
    for (const [id, f] of Object.entries(FICHAS)) {
      for (const txt of todosOsTextos(f)) {
        expect(txt, `${id}: ${txt}`).not.toMatch(manda)
        expect(txt, `${id}: ${txt}`).not.toMatch(marcas)
        expect(txt, `${id}: ${txt}`).not.toMatch(dose)
      }
    }
  })
  it('o aviso do controle químico lembra Mapa, receituário e agrônomo', () => {
    expect(AVISO_QUIMICO).toMatch(/Mapa/)
    expect(AVISO_QUIMICO).toMatch(/receituário/)
    expect(AVISO_QUIMICO).toMatch(/agrônomo/)
  })

  it('o mapa de candidatos do diagnóstico para alvos aponta para candidatos e alvos que existem, com o mesmo nome', () => {
    for (const [candidatoId, alvoId] of Object.entries(ALVO_DO_CANDIDATO)) {
      const c = CANDIDATOS.find((x) => x.id === candidatoId)
      expect(c, candidatoId).toBeDefined()
      expect(ALVOS[alvoId], alvoId).toBeDefined()
      expect(ALVOS[alvoId].nome, alvoId).toBe(c!.nome)
    }
  })
  it('todo alvo aparece na Biblioteca: pelo diagnóstico ou, se não tem árvore de sintomas, como ficha própria', () => {
    const viaDiagnostico = new Set(Object.values(ALVO_DO_CANDIDATO))
    for (const a of LISTA_ALVOS) expect(viaDiagnostico.has(a.id) || ALVOS_SO_NA_BIBLIOTECA.includes(a.id), a.id).toBe(true)
  })
  it('as fichas dos alvos com nível numérico da Embrapa citam o Sistemas de Produção 17 ou a Caderneta', () => {
    for (const id of ['percevejo', 'lagarta', 'anticarsia', 'spodoptera', 'helicoverpa', 'broca', 'tamandua'] as const) {
      const fontes = new Set(fatosDe(FICHAS[id]).flatMap((x) => x.fontes))
      expect(fontes.has('sp17pragas') || fontes.has('caderneta'), id).toBe(true)
    }
  })
})
