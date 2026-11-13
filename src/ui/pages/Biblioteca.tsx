import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Candidato } from '@/domain/funil'
import { ALVOS, LISTA_ALVOS } from '@/knowledge/alvos'
import { CANDIDATOS } from '@/knowledge/diagnostico'
import { ALVO_DO_CANDIDATO, ALVOS_SO_NA_BIBLIOTECA, AVISO_QUIMICO, FICHAS, ROTULO_MANEJO, type Fato, type Ficha, type GrupoManejo } from '@/knowledge/biblioteca'
import { FONTES, type FonteId } from '@/knowledge/fontes'
import { categoriaDe, iconeDoCandidato, ROTULO_CATEGORIA, type Categoria } from '../components/categoriaCandidato'
import { FOTO_CLASSE, fotosDoCandidato } from '../components/fotosDiagnostico'
import { FotoRef } from '../components/FotoRef'
import { Icon } from '../components/Icon'
import { Badge, Card, Input, Titulo, Vazio, type Tom } from '../components/kit'
import { semAcento, slugDe } from './slug'

/** Alvos do registro sem árvore de sintomas no diagnóstico: entram na Biblioteca só com a ficha completa. */
const EXTRAS: Candidato[] = ALVOS_SO_NA_BIBLIOTECA.map((id) => {
  const a = ALVOS[id]
  const ficha = FICHAS[id]
  return {
    id, nome: a.nome, cientifico: a.cientifico, tipo: a.tipo, alvo: id, fontes: a.fontes, origem: 'fonte' as const,
    resumo: ficha.classificacao.texto,
    confundeCom: [],
    comoConfirmar: ficha.reconhecer.map((x) => x.texto),
    proximosPassos: ['Fotografe o problema de perto, junto com a planta inteira.', 'Conte ou estime no ponto e leve ao agrônomo, que decide o manejo.'],
    perfil: {},
  }
})
/** Tudo o que a Biblioteca lista: os problemas do diagnóstico e os alvos que só têm ficha. */
const ASSUNTOS: Candidato[] = [...CANDIDATOS, ...EXTRAS]

type Filtro = 'todos' | Categoria
const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'todos', nome: 'Tudo' },
  { id: 'doenca', nome: 'Doenças' },
  { id: 'praga', nome: 'Pragas' },
  { id: 'nutricao', nome: 'Nutrientes' },
  { id: 'produto', nome: 'Produtos e adubo' },
  { id: 'clima', nome: 'Clima e solo' },
]
const TOM: Record<Categoria, Tom> = { doenca: 'info', praga: 'warn', nutricao: 'neutral', produto: 'danger', clima: 'neutral' }

export function Biblioteca() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = useMemo(() => {
    const q = semAcento(busca.trim())
    return ASSUNTOS.filter((c) => (filtro === 'todos' || categoriaDe(c) === filtro) && (!q || semAcento(`${c.nome} ${c.cientifico ?? ''} ${ROTULO_CATEGORIA[categoriaDe(c)]} ${c.sinalChave ?? ''} ${c.resumo}`).includes(q)))
  }, [busca, filtro])

  return (
    <>
      <Titulo sub={`${ASSUNTOS.length} assuntos da soja: doenças, pragas, nutrientes, produtos e clima.`}>Biblioteca</Titulo>
      <div className="space-y-4">
        <Input type="search" aria-label="Buscar na biblioteca" placeholder="Buscar: ferrugem, manganês, lagarta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 text-apoio font-semibold ${filtro === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface'}`}>{f.nome}</button>
          ))}
        </div>
        {lista.length === 0 ? (
          <Vazio icone="lupa" titulo="Nada encontrado" texto="Tente outra palavra, como o nome da praga ou da doença." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {lista.map((c) => (
              <li key={c.id}>
                <Link to="/biblioteca/$slug" params={{ slug: c.id }} className="flex min-h-20 items-center gap-4 rounded-card border border-line bg-surface p-3 shadow-card hover:bg-surface-2">
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
                    <FotoRef arquivo={fotosDoCandidato(c)} alt="" className="size-full object-cover object-center" fallback={<Icon name={iconeDoCandidato(c)} size={26} />} />
                  </span>
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block text-subtitulo font-bold leading-snug">{c.nome}</span>
                    {c.cientifico && <span className="block text-apoio italic text-text-2">{c.cientifico}</span>}
                    <Badge tom={TOM[categoriaDe(c)]}>{ROTULO_CATEGORIA[categoriaDe(c)]}</Badge>
                  </span>
                  <Icon name="seta" className="text-text-2" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/** O mesmo link serve pelo id do problema (ferrugem) e pelo nome antigo da Biblioteca (ferrugem-asiatica). */
const acharCandidato = (slug: string): Candidato | undefined => {
  const direto = ASSUNTOS.find((c) => c.id === slug)
  if (direto) return direto
  const alvo = LISTA_ALVOS.find((a) => slugDe(a) === slug || a.id === slug)
  if (!alvo) return undefined
  return ASSUNTOS.find((c) => c.alvo === alvo.id) ?? ASSUNTOS.find((c) => ALVO_DO_CANDIDATO[c.id] === alvo.id)
}

/** Ordem em que as fontes aparecem na lista e nos números [1], [2]… ao lado de cada fato. */
function numerar(ids: readonly FonteId[]): Map<FonteId, number> {
  const m = new Map<FonteId, number>()
  for (const id of ids) if (!m.has(id)) m.set(id, m.size + 1)
  return m
}

function ListaDeFatos({ fatos, numeros, ordenada }: { fatos: Fato[]; numeros: Map<FonteId, number>; ordenada?: boolean }) {
  const Tag = ordenada ? 'ol' : 'ul'
  return (
    <Tag className={`${ordenada ? 'list-decimal' : 'list-disc'} space-y-2 pl-5 text-text-2`}>
      {fatos.map((x) => (
        <li key={x.texto} className="leading-relaxed">
          {x.texto}
          <sup className="ml-1 whitespace-nowrap text-rotulo font-semibold text-text-2" aria-label={`Fonte ${x.fontes.map((id) => numeros.get(id)).join(', ')}`}>[{x.fontes.map((id) => numeros.get(id)).join(', ')}]</sup>
        </li>
      ))}
    </Tag>
  )
}

const GRUPOS: GrupoManejo[] = ['cultural', 'biologico', 'genetico', 'quimico', 'resistencia']

/** Ficha completa do alvo: tudo o que a Embrapa publica, com a fonte ao lado de cada fato e as lacunas ditas com honestidade. */
function FichaCompleta({ ficha, numeros }: { ficha: Ficha; numeros: Map<FonteId, number> }) {
  const secao = (titulo: string, fatos: Fato[], dica?: string) => fatos.length > 0 && (
    <Card className="space-y-3" key={titulo}>
      <h2 className="text-secao">{titulo}</h2>
      {dica && <p className="text-apoio text-text-2">{dica}</p>}
      <ListaDeFatos fatos={fatos} numeros={numeros} />
    </Card>
  )
  const manejo = GRUPOS.filter((g) => (ficha.manejo[g]?.length ?? 0) > 0)
  return (
    <section aria-label="Ficha completa" className="space-y-5">
      <Card className="space-y-2">
        <h2 className="text-secao">Em que grupo está</h2>
        <ListaDeFatos fatos={[ficha.classificacao]} numeros={numeros} />
      </Card>
      {secao('Dano e perdas', ficha.dano)}
      {secao('O que favorece', ficha.favorecem)}
      {secao('Como monitorar', ficha.monitorar)}
      {secao('Níveis de ação e tolerância', ficha.niveis, 'São referência técnica da Embrapa para orientar o agrônomo. A decisão de agir é dele.')}
      {manejo.length > 0 && (
        <Card className="space-y-4">
          <h2 className="text-secao">Manejo</h2>
          {manejo.map((g) => (
            <div key={g} className="space-y-2">
              <h3 className="font-semibold">{ROTULO_MANEJO[g]}</h3>
              {g === 'quimico' && <p className="rounded-xl bg-warn-soft p-3 text-apoio text-warn">{AVISO_QUIMICO}</p>}
              <ListaDeFatos fatos={ficha.manejo[g]!} numeros={numeros} />
            </div>
          ))}
        </Card>
      )}
      {secao('Cuidados', ficha.cuidados)}
      {ficha.lacunas.length > 0 && (
        <Card className="space-y-2 bg-surface-2">
          <h2 className="text-secao">O que a Embrapa não publica</h2>
          <ul className="list-disc space-y-1 pl-5 text-text-2">{ficha.lacunas.map((x) => <li key={x}>{x}</li>)}</ul>
        </Card>
      )}
    </section>
  )
}

export function Artigo() {
  const { slug } = useParams({ from: '/biblioteca/$slug' })
  const c = acharCandidato(slug)
  if (!c) return <Vazio icone="lupa" titulo="Assunto não encontrado" texto="Volte à Biblioteca e escolha outro assunto." acao={<Link to="/biblioteca" className="font-semibold text-brand">Ir para a Biblioteca</Link>} />
  const alvoId = c.alvo ?? ALVO_DO_CANDIDATO[c.id]
  const alvo = c.alvo ? ALVOS[c.alvo] : undefined
  const ficha = alvoId ? FICHAS[alvoId] : undefined
  const fontesDaFicha: FonteId[] = ficha ? [ficha.classificacao, ...ficha.dano, ...ficha.reconhecer, ...ficha.favorecem, ...ficha.monitorar, ...ficha.niveis, ...GRUPOS.flatMap((g) => ficha.manejo[g] ?? []), ...ficha.cuidados].flatMap((x) => x.fontes) : []
  const todasAsFontes: FonteId[] = [...new Set<FonteId>([...fontesDaFicha, ...(alvo?.fontes ?? []), ...c.fontes])]
  const numeros = numerar(todasAsFontes)
  const categoria = categoriaDe(c)
  const parecidos = c.confundeCom.map((nome) => ({ nome, outro: CANDIDATOS.find((x) => x.nome === nome) ?? CANDIDATOS.find((x) => x.id !== c.id && semAcento(x.nome).startsWith(semAcento(nome))) }))

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link to="/biblioteca" className="inline-flex min-h-11 items-center gap-1 text-apoio font-semibold text-brand"><Icon name="seta" size={18} className="rotate-180" />Biblioteca</Link>
      <Titulo sub={c.cientifico ? <span className="italic">{c.cientifico}</span> : undefined}>{c.nome}</Titulo>
      <div className="flex flex-wrap gap-2">
        <Badge tom={TOM[categoria]}>{ROTULO_CATEGORIA[categoria]}</Badge>
        {alvo && <Badge tom="neutral">Monitorar a partir de {alvo.estadioMin}</Badge>}
        {c.janela && <Badge tom="neutral">Costuma aparecer de {c.janela[0]} a {c.janela[1]}</Badge>}
      </div>
      <FotoRef arquivo={fotosDoCandidato(c)} alt={`Foto de referência: ${c.nome}`} className={`${FOTO_CLASSE} rounded-card border border-line`} />

      <Card className="space-y-2">
        <h2 className="text-secao">O que é</h2>
        <p className="leading-relaxed text-text-2">{c.resumo}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-secao">Como reconhecer</h2>
        {c.sinalChave && <p className="font-semibold leading-snug">{c.sinalChave}</p>}
        <ul className="list-disc space-y-1 pl-5 text-text-2">{c.comoConfirmar.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>

      {parecidos.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-secao">Pode ser confundido com</h2>
          <ul className="space-y-1">
            {parecidos.map(({ nome, outro }) => (
              <li key={nome}>{outro ? <Link to="/biblioteca/$slug" params={{ slug: outro.id }} className="font-semibold text-brand underline">{nome}</Link> : <span className="text-text-2">{nome}</span>}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="text-secao">O que fazer</h2>
        <ol className="list-decimal space-y-1 pl-5 text-text-2">{c.proximosPassos.map((x) => <li key={x}>{x}</li>)}</ol>
      </Card>

      {alvo && (
        <>
          <Card className="space-y-3">
            <h2 className="text-secao">Como coletar</h2>
            <dl className="space-y-3">
              <div><dt className="font-semibold">Método</dt><dd className="text-text-2">{alvo.coleta.metodo}</dd></div>
              <div><dt className="font-semibold">O que contar ou avaliar</dt><dd className="text-text-2">{alvo.coleta.unidade}</dd></div>
              <div><dt className="font-semibold">Onde olhar</dt><dd className="text-text-2">{alvo.coleta.parte}</dd></div>
            </dl>
          </Card>
          <Card className="space-y-2">
            <h2 className="text-secao">Fases que você pode registrar</h2>
            <ul className="list-disc space-y-1 pl-5 text-text-2">{alvo.fases.map((f) => <li key={f}>{f}</li>)}</ul>
          </Card>
        </>
      )}

      {ficha && (
        <>
          <h2 className="text-titulo">Ficha completa</h2>
          <FichaCompleta ficha={ficha} numeros={numeros} />
        </>
      )}

      <Link to="/diagnostico" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-semibold text-on-brand shadow-card hover:bg-brand-strong"><Icon name="diag" size={20} />Identificar o que estou vendo</Link>

      <section aria-label="Fontes" className="space-y-1 text-apoio text-text-2">
        <h2 className="text-corpo font-semibold text-text">Fontes</h2>
        <ul className="space-y-1">
          {todasAsFontes.map((id) => {
            const f = FONTES[id]
            return <li key={id}>{ficha && <span className="mr-1 font-semibold">[{numeros.get(id)}]</span>}{'url' in f && f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-brand underline">{f.rotulo}</a> : f.rotulo}</li>
          })}
        </ul>
        {c.origem === 'projeto' && <p>A descrição dos sintomas é de apoio e ainda está em conferência com agrônomo. Não é laudo.</p>}
      </section>
    </article>
  )
}
