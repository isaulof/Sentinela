import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Candidato } from '@/domain/funil'
import { ALVOS, LISTA_ALVOS } from '@/knowledge/alvos'
import { CANDIDATOS } from '@/knowledge/diagnostico'
import { FONTES } from '@/knowledge/fontes'
import { categoriaDe, iconeDoCandidato, ROTULO_CATEGORIA, type Categoria } from '../components/categoriaCandidato'
import { FOTO_CLASSE, fotosDoCandidato } from '../components/fotosDiagnostico'
import { FotoRef } from '../components/FotoRef'
import { Icon } from '../components/Icon'
import { Badge, Card, Input, Titulo, Vazio, type Tom } from '../components/kit'
import { semAcento, slugDe } from './slug'

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
    return CANDIDATOS.filter((c) => (filtro === 'todos' || categoriaDe(c) === filtro) && (!q || semAcento(`${c.nome} ${c.cientifico ?? ''} ${ROTULO_CATEGORIA[categoriaDe(c)]} ${c.sinalChave ?? ''} ${c.resumo}`).includes(q)))
  }, [busca, filtro])

  return (
    <>
      <Titulo sub={`${CANDIDATOS.length} assuntos da soja: doenças, pragas, nutrientes, produtos e clima.`}>Biblioteca</Titulo>
      <div className="space-y-4">
        <Input type="search" aria-label="Buscar na biblioteca" placeholder="Buscar: ferrugem, manganês, lagarta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} className={`min-h-11 shrink-0 rounded-xl border px-4 text-sm font-semibold ${filtro === f.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface'}`}>{f.nome}</button>
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
                    <span className="block text-lg font-bold leading-snug">{c.nome}</span>
                    {c.cientifico && <span className="block text-sm italic text-text-2">{c.cientifico}</span>}
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
  const direto = CANDIDATOS.find((c) => c.id === slug)
  if (direto) return direto
  const alvo = LISTA_ALVOS.find((a) => slugDe(a) === slug)
  return alvo ? CANDIDATOS.find((c) => c.alvo === alvo.id) : undefined
}

export function Artigo() {
  const { slug } = useParams({ from: '/biblioteca/$slug' })
  const c = acharCandidato(slug)
  if (!c) return <Vazio icone="lupa" titulo="Assunto não encontrado" texto="Volte à Biblioteca e escolha outro assunto." acao={<Link to="/biblioteca" className="font-semibold text-brand">Ir para a Biblioteca</Link>} />
  const alvo = c.alvo ? ALVOS[c.alvo] : undefined
  const categoria = categoriaDe(c)
  const parecidos = c.confundeCom.map((nome) => ({ nome, outro: CANDIDATOS.find((x) => x.nome === nome) ?? CANDIDATOS.find((x) => x.id !== c.id && semAcento(x.nome).startsWith(semAcento(nome))) }))

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link to="/biblioteca" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><Icon name="seta" size={18} className="rotate-180" />Biblioteca</Link>
      <Titulo sub={c.cientifico ? <span className="italic">{c.cientifico}</span> : undefined}>{c.nome}</Titulo>
      <div className="flex flex-wrap gap-2">
        <Badge tom={TOM[categoria]}>{ROTULO_CATEGORIA[categoria]}</Badge>
        {alvo && <Badge tom="neutral">Monitorar a partir de {alvo.estadioMin}</Badge>}
        {c.janela && <Badge tom="neutral">Costuma aparecer de {c.janela[0]} a {c.janela[1]}</Badge>}
      </div>
      <FotoRef arquivo={fotosDoCandidato(c)} alt={`Foto de referência: ${c.nome}`} className={`${FOTO_CLASSE} rounded-card border border-line`} />

      <Card className="space-y-2">
        <h2 className="text-xl">O que é</h2>
        <p className="leading-relaxed text-text-2">{c.resumo}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl">Como reconhecer</h2>
        {c.sinalChave && <p className="font-semibold leading-snug">{c.sinalChave}</p>}
        <ul className="list-disc space-y-1 pl-5 text-text-2">{c.comoConfirmar.map((x) => <li key={x}>{x}</li>)}</ul>
      </Card>

      {parecidos.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-xl">Pode ser confundido com</h2>
          <ul className="space-y-1">
            {parecidos.map(({ nome, outro }) => (
              <li key={nome}>{outro ? <Link to="/biblioteca/$slug" params={{ slug: outro.id }} className="font-semibold text-brand underline">{nome}</Link> : <span className="text-text-2">{nome}</span>}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-2">
        <h2 className="text-xl">O que fazer</h2>
        <ol className="list-decimal space-y-1 pl-5 text-text-2">{c.proximosPassos.map((x) => <li key={x}>{x}</li>)}</ol>
      </Card>

      {alvo && (
        <>
          <Card className="space-y-3">
            <h2 className="text-xl">Como coletar</h2>
            <dl className="space-y-3">
              <div><dt className="font-semibold">Método</dt><dd className="text-text-2">{alvo.coleta.metodo}</dd></div>
              <div><dt className="font-semibold">O que contar ou avaliar</dt><dd className="text-text-2">{alvo.coleta.unidade}</dd></div>
              <div><dt className="font-semibold">Onde olhar</dt><dd className="text-text-2">{alvo.coleta.parte}</dd></div>
            </dl>
          </Card>
          <Card className="space-y-2">
            <h2 className="text-xl">Fases que você pode registrar</h2>
            <ul className="list-disc space-y-1 pl-5 text-text-2">{alvo.fases.map((f) => <li key={f}>{f}</li>)}</ul>
          </Card>
        </>
      )}

      <Link to="/diagnostico" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-semibold text-on-brand shadow-card hover:bg-brand-strong"><Icon name="diag" size={20} />Identificar o que estou vendo</Link>

      <section aria-label="Fontes" className="space-y-1 text-sm text-text-2">
        <h2 className="text-base font-semibold text-text">Fontes</h2>
        <ul className="space-y-1">
          {[...new Set([...(alvo?.fontes ?? []), ...c.fontes])].map((id) => {
            const f = FONTES[id]
            return <li key={id}>{'url' in f && f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-brand underline">{f.rotulo}</a> : f.rotulo}</li>
          })}
        </ul>
        {c.origem === 'projeto' && <p>A descrição dos sintomas é de apoio e ainda está em conferência com agrônomo. Não é laudo.</p>}
      </section>
    </article>
  )
}
