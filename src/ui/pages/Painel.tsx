import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useOrdens, usePlanos, useTalhoes, useTodasPendencias, useTodosRegistros } from '@/data/hooks'
import { carregarDemonstracao } from '@/data/seed'
import { daRodada, nivelPorPonto } from '@/domain/analise'
import type { Nivel } from '@/domain/decision'
import { proximaAcao, type ProximaAcao, type ResumoTalhaoInicio } from '@/domain/proximaAcao'
import { Icon, type IconName } from '../components/Icon'
import { Badge, Button, Card, Titulo, Vazio, type Tom } from '../components/kit'
import { useSessao } from '../state/store'

const CRITICOS: Nivel[] = ['atingido', 'deteccao']
const ATENCAO: Nivel[] = ['proximo', ...CRITICOS]

interface Cartao { tom: 'ok' | 'warn'; icone: IconName; titulo: string; texto: string; botao: string; ir: () => void }

export function Painel() {
  const talhoes = useTalhoes()
  const planos = usePlanos()
  const todos = useTodosRegistros()
  const ordens = useOrdens()
  const pendencias = useTodasPendencias()
  const { setTalhao, setTalhaoAba } = useSessao()
  const navegar = useNavigate()
  const [agora] = useState(() => new Date())

  const resumos = useMemo<(ResumoTalhaoInicio & { atencao: number; area: number })[]>(
    () => (talhoes ?? []).map((t) => {
      const plano = planos?.find((p) => p.talhaoId === t.id)
      const ids = plano?.pontos.map((p) => p.id) ?? []
      const niveis = nivelPorPonto(daRodada((todos ?? []).filter((r) => r.talhaoId === t.id), agora))
      const comPendencia = new Set((pendencias ?? []).filter((p) => p.talhaoId === t.id && !p.resolvida).map((p) => p.pontoId))
      const feitos = ids.filter((id) => niveis.has(id) || comPendencia.has(id)).length
      return {
        talhaoId: t.id, nome: t.nome, total: ids.length, feitos, area: plano?.areaHa ?? 0,
        criticos: ids.filter((id) => CRITICOS.includes(niveis.get(id) ?? 'nao_aplicavel')).length,
        atencao: ids.filter((id) => ATENCAO.includes(niveis.get(id) ?? 'nao_aplicavel')).length,
      }
    }),
    [talhoes, planos, todos, pendencias, agora],
  )

  if (talhoes === undefined || todos === undefined) return null
  if (talhoes.length === 0) {
    return (
      <>
        <Titulo sub="Soja · Fazenda Santa Aurora">Início</Titulo>
        <Vazio icone="painel" titulo="Comece pela fazenda" texto="Desenhe o primeiro talhão em Talhões, ou carregue a demonstração da Fazenda Santa Aurora para ver o app funcionando." acao={<div className="flex flex-wrap justify-center gap-3"><Button onClick={() => void navegar({ to: '/talhoes' })}>Desenhar talhão</Button><Button variant="secondary" onClick={() => void carregarDemonstracao()}>Carregar demonstração</Button></div>} />
      </>
    )
  }

  const ordensAbertas = (ordens ?? []).filter((o) => o.status === 'aberta').length
  const pendAbertas = (pendencias ?? []).filter((p) => !p.resolvida).length
  const acao: ProximaAcao = proximaAcao(ordensAbertas, pendAbertas, resumos)
  const abrirTalhao = (id: string, to: '/coleta' | '/talhoes', aba?: 'resultados') => { setTalhao(id); if (aba) setTalhaoAba(aba); void navegar({ to }) }

  const cartao: Cartao = ((): Cartao => {
    switch (acao.tipo) {
      case 'ordens': return { tom: 'warn', icone: 'alerta', titulo: `${acao.quantas} ponto${acao.quantas > 1 ? 's' : ''} para checar`, texto: 'O clima ou o drone apontou um possível problema. Vá ao ponto e confirme.', botao: 'Ver pontos', ir: () => void navegar({ to: '/alertas' }) }
      case 'diagnostico': return { tom: 'warn', icone: 'diag', titulo: `${acao.quantas} achado${acao.quantas > 1 ? 's' : ''} sem diagnóstico`, texto: 'Você guardou fotos de algo que não soube identificar. Descubra o que é.', botao: 'Diagnosticar', ir: () => void navegar({ to: '/diagnostico' }) }
      case 'continuar': return { tom: 'ok', icone: 'campo', titulo: `Continue a coleta em ${acao.nome}`, texto: `${acao.feitos} de ${acao.total} pontos coletados.`, botao: 'Continuar coleta', ir: () => abrirTalhao(acao.talhaoId, '/coleta') }
      case 'resultados': return { tom: 'warn', icone: 'alerta', titulo: `${acao.criticos} ponto${acao.criticos > 1 ? 's' : ''} em atenção em ${acao.nome}`, texto: 'Veja onde está o problema no mapa e leve ao agrônomo.', botao: 'Ver no mapa', ir: () => abrirTalhao(acao.talhaoId, '/talhoes', 'resultados') }
      case 'comecar': return { tom: 'ok', icone: 'campo', titulo: `Comece a coleta em ${acao.nome}`, texto: 'Percorra os pontos e registre o que encontrar.', botao: 'Começar coleta', ir: () => abrirTalhao(acao.talhaoId, '/coleta') }
      case 'em_dia': return { tom: 'ok', icone: 'ok', titulo: 'Tudo em dia', texto: 'Nenhum ponto em atenção. Faça uma nova coleta quando for a hora.', botao: 'Nova coleta', ir: () => void navegar({ to: '/coleta' }) }
    }
  })()

  return (
    <>
      <Titulo sub="Soja · Fazenda Santa Aurora">Início</Titulo>

      <section aria-label="Próxima ação" className="relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-lift sm:p-7" style={{ background: cartao.tom === 'ok' ? 'var(--hero)' : 'linear-gradient(135deg, oklch(0.42 0.11 50), oklch(0.52 0.14 62))' }}>
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-52 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 size-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur"><Icon name={cartao.icone} size={28} /></span>
          <div className="min-w-0 flex-1 basis-56">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/75">Agora</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-[1.55rem] font-extrabold leading-tight tracking-tight">{cartao.titulo}</p>
            <p className="mt-1.5 text-white/85">{cartao.texto}</p>
          </div>
          <button type="button" onClick={cartao.ir} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 font-bold text-[oklch(0.3_0.08_155)] shadow-card transition active:scale-[0.97] sm:w-auto">{cartao.botao}<Icon name="seta" size={18} /></button>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="talhoes">
        <h2 id="talhoes" className="mb-3 text-xl">Seus talhões</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {resumos.map((r) => {
            const pct = r.total ? Math.round((r.feitos / r.total) * 100) : 0
            const tom: Tom = r.criticos > 0 ? 'danger' : r.atencao > 0 ? 'warn' : r.feitos > 0 ? 'ok' : 'neutral'
            const estado = r.total === 0 ? 'Sem plano de pontos' : r.criticos > 0 ? `${r.criticos} ponto${r.criticos > 1 ? 's' : ''} em atenção` : r.atencao > 0 ? 'Perto do nível de ação' : r.feitos > 0 ? 'Tudo certo' : 'Ainda não coletado'
            return (
              <li key={r.talhaoId}>
                <Card className="space-y-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex items-start justify-between gap-2"><h3 className="text-lg leading-tight">{r.nome}</h3><Badge tom={tom}>{estado}</Badge></div>
                  {r.total > 0 && (
                    <>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Coleta de ${r.nome}`}><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
                      <p className="text-sm text-text-2">{r.feitos} de {r.total} pontos · {r.area.toFixed(0)} ha</p>
                    </>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" disabled={r.total === 0} onClick={() => abrirTalhao(r.talhaoId, '/coleta')}>Coletar</Button>
                    <Button variant="secondary" disabled={r.total === 0} onClick={() => abrirTalhao(r.talhaoId, '/talhoes', 'resultados')}>Ver mapa</Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
