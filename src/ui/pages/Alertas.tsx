import { useMemo, useState } from 'react'
import { useOrdens, usePlano, useTalhoes } from '@/data/hooks'
import { novoId, repo } from '@/data/repo'
import { carregarDemonstracao } from '@/data/seed'
import { useClima } from '@/data/useClima'
import { chuvaNasProximasHoras, diaEmCuiaba, instante, LIMIARES, resumoPorDia, riscoFerrugem, riscoMofo, type RiscoDoenca } from '@/domain/climate'
import { ordemPorClima, SLA_CHECAGEM_H } from '@/domain/hibrido'
import type { OrdemChecagem } from '@/domain/entidades'
import { useNavigate } from '@tanstack/react-router'
import { Icon } from '../components/Icon'
import { Badge, Button, Card, Titulo, Vazio, type Tom } from '../components/kit'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

const RISCO_TOM: Record<RiscoDoenca['risco'], Tom> = { baixo: 'ok', moderado: 'warn', alto: 'danger' }
const ORIGEM: Record<OrdemChecagem['origem'], string> = { drone: 'Drone', clima: 'Clima / IoT', iot: 'Sensor IoT' }

function RiscoCard({ nome, r }: { nome: string; r: RiscoDoenca }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{nome}</h3><Badge tom={RISCO_TOM[r.risco]}>Risco {r.risco}</Badge></div>
      <p className="mt-2 text-apoio text-text-2">{r.explicacao}</p>
    </div>
  )
}

function BarrasMolhamento({ dias }: { dias: ReturnType<typeof resumoPorDia> }) {
  const ult = dias.slice(-LIMIARES.janelaDias)
  const W = 320, H = 130, bw = W / Math.max(1, ult.length)
  const topo = Math.max(12, ...ult.map((d) => d.horasMolhadas + 2))
  const y = (h: number) => H - 14 - (h / topo) * (H - 30)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Horas de molhamento estimado por dia" className="h-auto w-full">
      {[LIMIARES.ferrugem.horasMolhadasDia, LIMIARES.mofo.horasMolhadasDia].map((h, i) => (
        <g key={h}><line x1={0} x2={W} y1={y(h)} y2={y(h)} stroke="var(--line)" strokeDasharray="4 4" /><text x={2} y={y(h) - 3} textAnchor="start" fontSize={9} fill="var(--text-2)">{h} h ({i === 0 ? 'ferrugem' : 'mofo'})</text></g>
      ))}
      {ult.map((d, i) => (
        <g key={d.dia}>
          <rect x={i * bw + 6} y={y(d.horasMolhadas)} width={bw - 12} height={Math.max(2, H - 14 - y(d.horasMolhadas))} rx={4} fill="var(--info)" opacity={0.85} />
          <text x={i * bw + bw / 2} y={H - 3} textAnchor="middle" fontSize={9} fill="var(--text-2)">{d.dia.slice(8)}/{d.dia.slice(5, 7)}</text>
          <text x={i * bw + bw / 2} y={y(d.horasMolhadas) - 3} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--text)">{d.horasMolhadas}</text>
        </g>
      ))}
    </svg>
  )
}

function Fluxo() {
  const passos = [
    { rotulo: 'ALERTA', cor: 'warn' as Tom, titulo: 'O clima avisa', texto: 'O app calcula o risco de ferrugem e de mofo-branco pelo clima dos últimos dias. Um alerta NÃO é um diagnóstico.' },
    { rotulo: 'ORDEM', cor: 'info' as Tom, titulo: 'Ordem de checagem', texto: `O app liga o alerta ao ponto de amostragem mais próximo e abre uma ordem, com prazo de ${SLA_CHECAGEM_H} h.` },
    { rotulo: 'CONFIRMAÇÃO', cor: 'ok' as Tom, titulo: 'Inspeção em campo', texto: 'O amostrador vai ao ponto, procura sinais com lupa, fotografa e responde: biótica confirmada ou falso positivo (com a causa).' },
    { rotulo: 'DECISÃO', cor: 'danger' as Tom, titulo: 'Agrônomo decide', texto: 'Com clima e confirmação em campo, o agrônomo decide aplicar ou não. Falso positivo vira "aplicação evitada".' },
  ]
  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {passos.map((p, i) => (
        <li key={p.rotulo} className="relative rounded-2xl border border-line bg-surface p-4">
          <Badge tom={p.cor}>{i + 1} · {p.rotulo}</Badge>
          <h3 className="mt-2 font-semibold">{p.titulo}</h3>
          <p className="mt-1 text-apoio text-text-2">{p.texto}</p>
          {i < passos.length - 1 && <Icon name="seta" className="absolute -right-3.5 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-bg text-text-2 md:block" />}
        </li>
      ))}
    </ol>
  )
}

export function Alertas() {
  const talhoes = useTalhoes()
  const { talhaoId, setTalhao, setPontoFoco } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const navegar = useNavigate()
  const talhao = talhoes?.find((t) => t.id === talhaoId) ?? talhoes?.[0]
  const plano = usePlano(talhao?.id)
  const ordens = useOrdens()
  const [tentativa, setTentativa] = useState(0)
  const [agora, setAgora] = useState(() => new Date())

  const centro = useMemo(() => (talhao ? { lng: talhao.anel.reduce((a, p) => a + p[0], 0) / talhao.anel.length, lat: talhao.anel.reduce((a, p) => a + p[1], 0) / talhao.anel.length } : null), [talhao])
  const clima = useClima(centro?.lat ?? null, centro?.lng ?? null, tentativa)
  const dias = useMemo(() => (clima.estado === 'ok' ? resumoPorDia(clima.horas) : []), [clima])
  const diasPassados = useMemo(() => dias.filter((d) => d.dia <= diaEmCuiaba(agora)), [dias, agora])
  const ferrugem = riscoFerrugem(diasPassados)
  const mofo = riscoMofo(diasPassados)
  const abertas = (ordens ?? []).filter((o) => o.status === 'aberta')
  const resolvidas = (ordens ?? []).filter((o) => o.status !== 'aberta')

  if (talhoes === undefined) return null
  if (talhoes.length === 0) {
    return (<><Titulo>Alertas</Titulo><Vazio icone="alerta" titulo="Nenhum talhão para monitorar" texto="Cadastre um talhão ou carregue a demonstração para ver o risco pelo clima e as ordens de checagem." acao={<Button onClick={() => void carregarDemonstracao()}>Carregar demonstração</Button>} /></>)
  }

  async function criarOrdemClima(d: 'ferrugem' | 'mofo', r: RiscoDoenca) {
    if (!talhao || !plano || plano.pontos.length === 0) return
    const o = ordemPorClima(talhao.id, plano.pontos[0]!.id, d, r.risco, novoId('ORD'), new Date())
    if (!o) return mostrar('Só o risco alto gera ordem de checagem.', 'erro')
    await repo.salvarOrdem(o)
    mostrar('Ordem de checagem criada')
  }

  const irAoPonto = (o: OrdemChecagem) => { setTalhao(o.talhaoId); setPontoFoco(o.pontoId); void navegar({ to: '/coleta' }) }
  const minutos = (iso: string) => Math.max(0, Math.round((agora.getTime() - Date.parse(iso)) / 60000))
  const idade = (iso: string) => { const m = minutos(iso); return m < 90 ? `${m} min` : m < 2880 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} dias` }
  const chuva6h = clima.estado === 'ok' ? chuvaNasProximasHoras(clima.horas, agora) : null
  const agoraH = clima.estado === 'ok' ? [...clima.horas].reverse().find((h) => instante(h.hora) <= agora.getTime()) : undefined

  return (
    <>
      <Titulo sub="Risco pelo clima e ordens de checagem: alerta, confirmação em campo e decisão do agrônomo.">Alertas</Titulo>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Talhão">
        {talhoes.map((t) => (
          <button key={t.id} type="button" onClick={() => setTalhao(t.id)} className={`min-h-11 rounded-xl border px-4 text-apoio font-semibold ${t.id === talhao?.id ? 'border-brand bg-brand text-on-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>{t.nome}</button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div><h2 className="text-subtitulo">Clima e risco de doenças</h2><p className="text-apoio text-text-2">Estação virtual · dados da Open-Meteo em {talhao?.nome}</p></div>
            <Button variant="ghost" onClick={() => { setTentativa((t) => t + 1); setAgora(new Date()) }} className="min-h-11">Atualizar</Button>
          </div>
          {clima.estado === 'carregando' && <p className="text-text-2" role="status">Buscando clima…</p>}
          {clima.estado === 'erro' && <p className="rounded-xl bg-warn-soft p-3 text-warn" role="alert">{clima.motivo}. Sem internet nem leitura anterior guardada, o risco não pode ser calculado.</p>}
          {clima.estado === 'ok' && (
            <>
              {clima.doCache && <p className="rounded-xl bg-warn-soft p-3 text-apoio text-warn">Sem conexão: mostrando a última leitura de {new Date(clima.buscadoEm).toLocaleString('pt-BR')}.</p>}
              {agoraH && (
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-2 p-2"><dt className="text-rotulo text-text-2">Temperatura</dt><dd className="text-secao font-bold">{agoraH.temperaturaC.toFixed(1)} °C</dd></div>
                  <div className="rounded-xl bg-surface-2 p-2"><dt className="text-rotulo text-text-2">Umidade</dt><dd className="text-secao font-bold">{Math.round(agoraH.umidadePct)}%</dd></div>
                  <div className="rounded-xl bg-surface-2 p-2"><dt className="text-rotulo text-text-2">Chuva 6 h</dt><dd className="text-secao font-bold">{(chuva6h ?? 0).toFixed(1)} mm</dd></div>
                </dl>
              )}
              <BarrasMolhamento dias={diasPassados} />
              <div className="grid gap-3">
                <RiscoCard nome="Ferrugem-asiática" r={ferrugem} />
                <RiscoCard nome="Mofo-branco" r={mofo} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={ferrugem.risco !== 'alto'} onClick={() => void criarOrdemClima('ferrugem', ferrugem)}>Criar ordem (ferrugem)</Button>
                <Button variant="secondary" disabled={mofo.risco !== 'alto'} onClick={() => void criarOrdemClima('mofo', mofo)}>Criar ordem (mofo)</Button>
              </div>
              <details className="rounded-xl border border-line p-3 text-apoio">
                <summary className="cursor-pointer font-semibold">Como o risco é calculado</summary>
                <div className="mt-2 space-y-2 text-text-2">
                  <p>Uma hora é considerada <b className="text-text">molhada</b> quando a umidade relativa é de {LIMIARES.umidadeMolhadaPct}% ou mais, ou há chuva (proxy do molhamento foliar; não é medido).</p>
                  <p>Ferrugem: dia favorável com média de {LIMIARES.ferrugem.tMin}–{LIMIARES.ferrugem.tMax} °C e ≥ {LIMIARES.ferrugem.horasMolhadasDia} h molhadas. Mofo-branco: {LIMIARES.mofo.tMin}–{LIMIARES.mofo.tMax} °C (faixa da Embrapa CT 152) e ≥ {LIMIARES.mofo.horasMolhadasDia} h molhadas.</p>
                  <p>Risco moderado com {LIMIARES.ferrugem.diasModerado} dias favoráveis em 7; alto com {LIMIARES.ferrugem.diasAlto} ou mais.</p>
                  <p className="text-warn">São indicadores de projeto para priorizar inspeção. Não substituem o coletor de esporos nem a decisão do agrônomo.</p>
                </div>
              </details>
            </>
          )}
        </Card>

        <Card className="space-y-4">
          <p className="text-apoio text-text-2">O clima mostra <b className="text-text">quando</b> as condições favorecem uma doença, não <b className="text-text">se</b> ela está na lavoura. Por isso o alerta vira uma ordem de checagem em campo, não uma aplicação.</p>
          <div>
            <h3 className="mb-1.5 font-semibold">Limitações do sistema</h3>
            <ul className="space-y-1.5 text-apoio text-text-2">
              <li className="flex gap-2"><Icon name="info" size={18} className="mt-0.5 shrink-0" />Sem sinal de internet no campo, o app funciona offline, mas o clima novo e os mapas não carregados ficam indisponíveis.</li>
              <li className="flex gap-2"><Icon name="info" size={18} className="mt-0.5 shrink-0" />O risco é calculado por modelo meteorológico, não por uma estação na fazenda; só a inspeção em campo confirma a doença.</li>
            </ul>
          </div>
        </Card>
      </div>

      <section className="mt-8 space-y-3" aria-labelledby="ordens">
        <h2 id="ordens" className="text-secao">Ordens de checagem</h2>
        {(ordens ?? []).length === 0 && <p className="text-text-2">Nenhuma ordem ainda. Crie uma ordem a partir do risco climático.</p>}
        <div className="grid gap-3 lg:grid-cols-2">
          {abertas.map((o) => (
            <Card key={o.id} className="space-y-2 border-warn">
              <div className="flex flex-wrap items-center gap-2"><Badge tom="warn" icon="alerta">Aberta</Badge><Badge tom="neutral">{ORIGEM[o.origem]}</Badge><span className="text-apoio text-text-2">há {idade(o.criadaEm)} · prazo {SLA_CHECAGEM_H} h</span></div>
              <p><b>{talhoes.find((t) => t.id === o.talhaoId)?.nome}</b> · ponto {o.pontoId}</p>
              <p className="text-apoio text-text-2">{o.motivo}</p>
              <Button icon="campo" onClick={() => irAoPonto(o)}>Ir ao ponto e checar</Button>
            </Card>
          ))}
          {resolvidas.map((o) => (
            <Card key={o.id} className="space-y-2">
              <div className="flex flex-wrap items-center gap-2"><Badge tom={o.status === 'confirmada' ? 'danger' : 'ok'} icon="check">{o.status === 'confirmada' ? 'Confirmada em campo' : 'Falso positivo'}</Badge><Badge tom="neutral">{ORIGEM[o.origem]}</Badge></div>
              <p><b>{talhoes.find((t) => t.id === o.talhaoId)?.nome}</b> · ponto {o.pontoId}</p>
              <p className="text-apoio text-text-2">{o.motivo}</p>
              {o.causa && <p className="text-apoio"><b>Causa encontrada:</b> {o.causa}</p>}
              {o.status === 'falso_positivo' && <p className="text-apoio text-ok">Aplicação desnecessária evitada.</p>}
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8 space-y-3" aria-labelledby="fluxo">
        <h2 id="fluxo" className="text-secao">Como a informação circula</h2>
        <Fluxo />
      </section>
    </>
  )
}
