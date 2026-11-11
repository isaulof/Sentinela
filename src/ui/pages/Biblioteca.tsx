import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { LISTA_ALVOS } from '@/knowledge/alvos'
import { FONTES } from '@/knowledge/fontes'
import { Badge, Card, Input, Titulo, Vazio } from '../components/kit'
import { FotoRef } from '../components/FotoRef'
import { Icon } from '../components/Icon'
import { iconeDoAlvo } from '../components/iconeAlvo'

import { semAcento, slugDe } from './slug'

type Filtro = 'todos' | 'praga' | 'doenca'
const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'todos', nome: 'Tudo' },
  { id: 'praga', nome: 'Pragas' },
  { id: 'doenca', nome: 'Doenças' },
]

export function Biblioteca() {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const lista = useMemo(() => {
    const q = semAcento(busca.trim())
    return LISTA_ALVOS.filter((a) => (filtro === 'todos' || a.tipo === filtro) && (!q || semAcento(`${a.nome} ${a.cientifico} ${a.tipo} ${a.coleta.metodo} ${a.coleta.parte}`).includes(q)))
  }, [busca, filtro])

  return (
    <>
      <Titulo sub="Consulte sobre pragas e doenças da soja.">Biblioteca</Titulo>
      <div className="space-y-4">
        <Input type="search" aria-label="Buscar na biblioteca" placeholder="Buscar: ferrugem, percevejo, lagarta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex gap-2" role="group" aria-label="Filtrar por tipo">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${filtro === f.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>{f.nome}</button>
          ))}
        </div>
        {lista.length === 0 ? (
          <Vazio icone="lupa" titulo="Nada encontrado" texto="Tente outra palavra, como o nome da praga ou da doença." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {lista.map((a) => (
              <li key={a.id}>
                <Link to="/biblioteca/$slug" params={{ slug: slugDe(a) }} className="flex min-h-20 items-center gap-4 rounded-card border border-line bg-surface p-4 shadow-card hover:bg-surface-2">
                  <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand">
                    <Icon name={iconeDoAlvo(a)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold">{a.nome}</span>
                    <span className="block text-sm italic text-text-2">{a.cientifico}</span>
                    <Badge tom={a.tipo === 'praga' ? 'warn' : 'info'}>{a.tipo === 'praga' ? 'Praga' : 'Doença'}</Badge>
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

export function Artigo() {
  const { slug } = useParams({ from: '/biblioteca/$slug' })
  const alvo = LISTA_ALVOS.find((a) => slugDe(a) === slug)
  if (!alvo) return <Vazio icone="lupa" titulo="Assunto não encontrado" texto="Volte à Biblioteca e escolha outro assunto." acao={<Link to="/biblioteca" className="font-semibold text-brand">Ir para a Biblioteca</Link>} />

  return (
    <article className="mx-auto max-w-2xl space-y-5">
      <Link to="/biblioteca" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand"><Icon name="seta" size={18} className="rotate-180" />Biblioteca</Link>
      <Titulo sub={<span className="italic">{alvo.cientifico}</span>}>{alvo.nome}</Titulo>
      <div className="flex flex-wrap gap-2">
        <Badge tom={alvo.tipo === 'praga' ? 'warn' : 'info'}>{alvo.tipo === 'praga' ? 'Praga' : 'Doença'}</Badge>
        <Badge tom="neutral">Monitorar a partir de {alvo.estadioMin}</Badge>
      </div>
      <FotoRef arquivo={`${slugDe(alvo)}.jpg`} alt={`Foto de referência: ${alvo.nome}`} className="aspect-video w-full rounded-card border border-line object-cover" />

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

      <Link to="/diagnostico" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 font-semibold text-on-brand shadow-card hover:bg-brand-strong"><Icon name="diag" size={20} />Identificar o que estou vendo</Link>

      <section aria-label="Fontes" className="space-y-1 text-sm text-text-2">
        <h2 className="text-base font-semibold text-text">Fontes</h2>
        <ul className="space-y-1">
          {alvo.fontes.map((id) => {
            const f = FONTES[id]
            return <li key={id}>{'url' in f && f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-brand underline">{f.rotulo}</a> : f.rotulo}</li>
          })}
        </ul>
      </section>
    </article>
  )
}
