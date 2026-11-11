import { Link, useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFazenda, useOrdens, usePlanos, useTalhoes, useTodasPendencias, useTodosRegistros } from '@/data/hooks'
import { carregarDemonstracao } from '@/data/seed'
import { daRodada, nivelPorPonto } from '@/domain/analise'
import { NOME_FAZENDA_PADRAO, type Talhao } from '@/domain/entidades'
import { panorama, type Panorama } from '@/domain/panorama'
import { dataBr } from '@/domain/tempo'
import { proximaAcao, type ProximaAcao } from '@/domain/proximaAcao'
import { ALVOS } from '@/knowledge/alvos'
import { Icon, type IconName } from '../components/Icon'
import { MiniTalhao } from '../components/MiniTalhao'
import { Badge, Button, Vazio, type Tom } from '../components/kit'
import { useSessao } from '../state/store'

interface Cartao { tom: 'ok' | 'warn'; icone: IconName; titulo: string; texto: string; botao: string; ir: () => void }

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

function situacao(p: Panorama): { tom: Tom; texto: string } {
  if (p.total === 0) return { tom: 'neutral', texto: 'Sem plano' }
  if (p.coletados === 0) return { tom: 'neutral', texto: 'Sem coleta' }
  if (p.emAtencao > 0) return { tom: 'danger', texto: plural(p.emAtencao, 'ponto em atenção', 'pontos em atenção') }
  return { tom: 'ok', texto: 'Sem alertas' }
}

function CartaoTalhao({ talhao, p, plano }: { talhao: Talhao; p: Panorama; plano: Parameters<typeof MiniTalhao>[0]['pontos'] }) {
  const setTalhao = useSessao((s) => s.setTalhao)
  const setAba = useSessao((s) => s.setTalhaoAba)
  const { tom, texto } = situacao(p)
  const pct = p.total ? Math.round((p.coletados / p.total) * 100) : 0
  const analise = p.emAtencao > 0 && p.alvoDominante
    ? `${ALVOS[p.alvoDominante].nome}${p.setor ? (p.setor === 'centro' ? ' · no centro do talhão' : ` · concentrado no ${p.setor}`) : ''}`
    : p.coletados > 0 ? `${p.pctComOcorrencia}% dos pontos com alguma ocorrência` : 'Faça a primeira coleta para ver a análise'
  return (
    <li>
      <Link to="/talhoes/$id" params={{ id: talhao.id }} onClick={() => { setTalhao(talhao.id); setAba('resultados') }} className="block rounded-card bg-surface p-3.5 ring-1 ring-line transition active:bg-surface-2">
        <div className="flex gap-3.5">
          <MiniTalhao anel={talhao.anel} pontos={plano} estados={p.estados} className="size-24 shrink-0 rounded-xl bg-surface-2" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-corpo">{talhao.nome}</h3>
              <Icon name="seta" size={18} className="mt-0.5 shrink-0 text-text-2" />
            </div>
            <p className="text-apoio text-text-2">{p.areaHa.toFixed(0)} ha · {talhao.estadio} · {talhao.cultivar}</p>
            <div className="mt-auto pt-2"><Badge tom={tom}>{texto}</Badge></div>
          </div>
        </div>
        <p className="mt-3 text-apoio">{analise}</p>
        <div className="mt-2.5 flex items-center gap-3 text-rotulo text-text-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Coleta de ${talhao.nome}`}><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
          <span className="tabular-nums">{p.coletados}/{p.total} pontos</span>
          {p.pontosComFoto > 0 && <span className="inline-flex items-center gap-1"><Icon name="camera" size={13} />{p.pontosComFoto}</span>}
          {p.ultimaVisita && <span>{dataBr(p.ultimaVisita)}</span>}
        </div>
      </Link>
    </li>
  )
}

export function Painel() {
  const talhoes = useTalhoes()
  const planos = usePlanos()
  const todos = useTodosRegistros()
  const ordens = useOrdens()
  const pendencias = useTodasPendencias()
  const { setTalhao, setTalhaoAba, amostrador } = useSessao()
  const navegar = useNavigate()
  const fazenda = useFazenda()
  const [agora] = useState(() => new Date())

  const dados = useMemo(() => (talhoes ?? []).map((t) => {
    const plano = planos?.find((p) => p.talhaoId === t.id)
    const regs = (todos ?? []).filter((r) => r.talhaoId === t.id)
    const pend = (pendencias ?? []).filter((x) => x.talhaoId === t.id)
    // A "rodada" (7 dias) decide a próxima ação: coleta antiga volta a pedir nova coleta.
    const niveis = nivelPorPonto(daRodada(regs, agora))
    const ids = plano?.pontos.map((x) => x.id) ?? []
    const comPendencia = new Set(pend.filter((x) => !x.resolvida).map((x) => x.pontoId))
    const rodada = {
      talhaoId: t.id, nome: t.nome, total: ids.length,
      feitos: ids.filter((id) => niveis.has(id) || comPendencia.has(id)).length,
      criticos: ids.filter((id) => { const n = niveis.get(id); return n === 'atingido' || n === 'deteccao' }).length,
    }
    return { talhao: t, plano, rodada, p: panorama(plano, regs, pend, t.anel) }
  }), [talhoes, planos, todos, pendencias, agora])

  if (talhoes === undefined || todos === undefined) return null

  const ordensAbertas = (ordens ?? []).filter((o) => o.status === 'aberta').length
  const novoTalhao = () => void navegar({ to: '/talhoes/novo' })

  const cabecalho = (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-apoio text-text-2">{amostrador.trim() ? `Olá, ${amostrador.trim().split(' ')[0]}` : 'Olá'}</p>
        <h1 className="truncate text-titulo">{fazenda?.nome ?? NOME_FAZENDA_PADRAO}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link to="/alertas" aria-label={ordensAbertas ? `Alertas, ${ordensAbertas} para checar` : 'Alertas'} className="relative grid size-11 place-items-center rounded-full text-text-2 transition hover:bg-surface-2 active:bg-surface-2">
          <Icon name="alerta" size={22} />
          {ordensAbertas > 0 && <span aria-hidden className="absolute right-2 top-2 size-2.5 rounded-full bg-danger ring-2 ring-bg" />}
        </Link>
        <Link to="/perfil" aria-label="Perfil e configurações" className="grid size-11 place-items-center rounded-full text-text-2 transition hover:bg-surface-2 active:bg-surface-2">
          <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-apoio font-bold text-brand">{amostrador.trim() ? amostrador.trim()[0]!.toUpperCase() : <Icon name="perfil" size={17} />}</span>
        </Link>
      </div>
    </header>
  )

  if (talhoes.length === 0) {
    return (
      <>
        {cabecalho}
        <Vazio icone="mapa" titulo="Comece pela fazenda" texto="Desenhe o contorno do primeiro talhão no mapa, ou carregue a demonstração para ver o app funcionando." acao={<div className="flex flex-wrap justify-center gap-3"><Button icon="lapis" onClick={novoTalhao}>Desenhar talhão</Button><Button variant="secondary" onClick={() => void carregarDemonstracao()}>Carregar demonstração</Button></div>} />
      </>
    )
  }

  const pendAbertas = (pendencias ?? []).filter((p) => !p.resolvida).length
  const acao: ProximaAcao = proximaAcao(ordensAbertas, pendAbertas, dados.map((d) => d.rodada))
  const abrir = (id: string, to: '/coleta' | '/talhoes/$id') => {
    setTalhao(id)
    if (to === '/coleta') void navegar({ to })
    else { setTalhaoAba('resultados'); void navegar({ to, params: { id } }) }
  }

  const cartao: Cartao = ((): Cartao => {
    switch (acao.tipo) {
      case 'ordens': return { tom: 'warn', icone: 'alerta', titulo: `${plural(acao.quantas, 'ponto', 'pontos')} para checar`, texto: 'O clima ou o drone apontou um possível problema. Confirme em campo.', botao: 'Ver pontos', ir: () => void navegar({ to: '/alertas' }) }
      case 'diagnostico': return { tom: 'warn', icone: 'diag', titulo: `${plural(acao.quantas, 'achado', 'achados')} sem diagnóstico`, texto: 'Há fotos de algo que não foi identificado.', botao: 'Diagnosticar', ir: () => void navegar({ to: '/diagnostico' }) }
      case 'continuar': return { tom: 'ok', icone: 'campo', titulo: `Continue a coleta em ${acao.nome}`, texto: `${acao.feitos} de ${acao.total} pontos coletados.`, botao: 'Continuar', ir: () => abrir(acao.talhaoId, '/coleta') }
      case 'resultados': return { tom: 'warn', icone: 'alerta', titulo: `${plural(acao.criticos, 'ponto', 'pontos')} em atenção em ${acao.nome}`, texto: 'Veja onde está o problema e leve ao agrônomo.', botao: 'Ver mapa', ir: () => abrir(acao.talhaoId, '/talhoes/$id') }
      case 'comecar': return { tom: 'ok', icone: 'campo', titulo: `Comece a coleta em ${acao.nome}`, texto: 'Percorra os pontos e registre o que encontrar.', botao: 'Começar', ir: () => abrir(acao.talhaoId, '/coleta') }
      case 'em_dia': return { tom: 'ok', icone: 'ok', titulo: 'Tudo em dia', texto: 'Nenhum ponto em atenção. Faça nova coleta quando for a hora.', botao: 'Nova coleta', ir: () => void navegar({ to: '/coleta' }) }
    }
  })()
  const aviso = cartao.tom === 'warn'

  return (
    <>
      {cabecalho}

      <section aria-label="Próxima ação" className={`flex items-center gap-3.5 rounded-card p-4 ring-1 ${aviso ? 'bg-warn-soft ring-warn/25' : 'bg-brand-soft ring-brand/20'}`}>
        <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full ${aviso ? 'bg-warn text-warn-soft' : 'bg-brand text-on-brand'}`}><Icon name={cartao.icone} size={22} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{cartao.titulo}</p>
          <p className="mt-0.5 text-apoio text-text-2">{cartao.texto}</p>
        </div>
        <button type="button" onClick={cartao.ir} className={`inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-4 text-apoio font-semibold transition active:scale-95 ${aviso ? 'bg-warn text-warn-soft' : 'bg-brand text-on-brand'}`}>{cartao.botao}</button>
      </section>

      <section className="mt-7" aria-labelledby="talhoes">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="talhoes" className="text-subtitulo">Seus talhões</h2>
          <button type="button" onClick={novoTalhao} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-apoio font-semibold text-brand transition active:bg-brand-soft"><Icon name="mais1" size={18} />Novo talhão</button>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {dados.map(({ talhao, plano, p }) => <CartaoTalhao key={talhao.id} talhao={talhao} p={p} plano={plano?.pontos ?? []} />)}
        </ul>
      </section>
    </>
  )
}
