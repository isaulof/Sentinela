import { useMemo } from 'react'
import type { Nivel } from '@/domain/decision'
import { descritiva, pctNoLimite } from '@/domain/estatistica'
import {
  type AlertaQualidade, type CalorHonesto, type DiferencaPonto, type EscalaCalor, type Mudanca, distribuicaoPorNivel, matrizPontoVisita, moranI,
  qualidadeDosDados, raioDeInfluenciaM, rotuloValor, tendencia, FATOR_ATIPICO, FATOR_RAIO, LIMIAR_LONGE_DO_PONTO_M, MIN_AMOSTRAS_CALOR, MIN_PONTOS_ATIPICO, MIN_PONTOS_MORAN,
} from '@/domain/mapa'
import type { PlanoSalvo } from '@/domain/entidades'
import type { Registro } from '@/domain/registro'
import { amostrasNaData, ateODia, UNIDADE_ALVO, valorDoRegistro } from '@/domain/resultados'
import { serieTemporal } from '@/domain/analise'
import { dataBr } from '@/domain/tempo'
import { SINAL_FRACO_M } from '@/domain/navegacao'
import { ALVOS, type AlvoId } from '@/knowledge/alvos'
import { COR_MUDANCA } from './estadoPonto'
import { Icon } from './Icon'
import { Card } from './kit'

const ORDEM_MUDANCA: Mudanca[] = ['piorou', 'melhorou', 'igual', 'novo', 'sem_leitura']

const GRADIENTE = 'linear-gradient(90deg,#fff3b0,#f59f3a,#c0391f)'

/** Legenda do calor com números: escala fixa de 0 ao teto, marca do nível de ação, cobertura e o porquê de não haver calor. */
export function LegendaCalor({ escala, unidade, calor }: { escala: EscalaCalor; unidade: string; calor: CalorHonesto }) {
  if (calor.motivo) {
    return (
      <div role="status" className="rounded-xl bg-info-soft p-3 text-apoio">
        <p className="font-semibold text-info">Sem mapa de calor</p>
        <p className="mt-0.5">{calor.motivo}</p>
        <p className="mt-0.5 text-text-2">Os pontos continuam coloridos pelo estado.</p>
      </div>
    )
  }
  const posLimite = escala.limite !== null ? Math.min(100, (escala.limite / escala.teto) * 100) : null
  return (
    <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
      <p className="text-apoio font-semibold">Calor · {unidade}</p>
      <div className="relative mt-3 mb-6">
        <div aria-hidden className="h-2.5 rounded-full" style={{ background: GRADIENTE }} />
        {posLimite !== null && <span aria-hidden className="absolute -top-1 h-4.5 w-0.5 bg-text" style={{ left: `${posLimite}%` }} />}
        <span className="absolute left-0 top-4 text-rotulo tabular-nums text-text-2">0</span>
        {posLimite !== null && posLimite > 12 && posLimite < 88 && <span className="absolute top-4 -translate-x-1/2 whitespace-nowrap text-rotulo font-semibold tabular-nums" style={{ left: `${posLimite}%` }}>{rotuloValor(escala.limite!)} nível de ação</span>}
        <span className="absolute right-0 top-4 text-rotulo tabular-nums text-text-2">{rotuloValor(escala.teto)}</span>
      </div>
      <p className="text-rotulo text-text-2">
        Escala de 0 a {rotuloValor(escala.teto)} {unidade}, a mesma em todas as visitas (o maior valor já registrado é {rotuloValor(escala.maximoObservado)}).
        {posLimite !== null && posLimite >= 88 && <> Nível de ação: {rotuloValor(escala.limite!)} {unidade}.</>}
        {posLimite !== null && posLimite <= 12 && <> Nível de ação: {rotuloValor(escala.limite!)} {unidade}.</>}
        {escala.limite === null && ' Este alvo não tem nível de ação numérico nas fontes.'}
      </p>
      <p className="mt-1 text-rotulo text-text-2">Tem dado em {calor.coberturaPct}% do talhão (até {Math.round(calor.raioM ?? 0)} m de cada ponto). A parte hachurada não tem dado.</p>
    </div>
  )
}

/** Legenda da camada de mudança entre visitas, com a contagem de pontos. */
export function LegendaMudanca({ diffs, anterior }: { diffs: readonly DiferencaPonto[]; anterior: string | null }) {
  if (!anterior) return <p role="status" className="rounded-xl bg-info-soft p-3 text-apoio">Só há uma visita: a mudança aparece a partir da segunda.</p>
  const cont = new Map<Mudanca, number>()
  for (const d of diffs) cont.set(d.mudanca, (cont.get(d.mudanca) ?? 0) + 1)
  return (
    <div className="rounded-xl bg-surface p-3 ring-1 ring-line">
      <p className="text-apoio font-semibold">Mudança desde a visita de {dataBr(anterior)}</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-apoio">
        {ORDEM_MUDANCA.filter((m) => cont.get(m)).map((m) => (
          <li key={m} className="flex items-center gap-1.5"><span aria-hidden className="grid size-5 place-items-center rounded-full text-[0.625rem] font-bold" style={{ background: COR_MUDANCA[m].fundo, color: COR_MUDANCA[m].texto }}>{COR_MUDANCA[m].simbolo}</span>{COR_MUDANCA[m].rotulo}: <b>{cont.get(m)}</b></li>
        ))}
      </ul>
      <p className="mt-1.5 text-rotulo text-text-2">"Sem nova leitura" é diferente de "igual": o ponto não foi revisitado, então o app não sabe se mudou.</p>
    </div>
  )
}

const ICONE_ALERTA = { aviso: 'alerta', info: 'info' } as const

/** Alertas de qualidade dos dados da visita: o que pode tornar o mapa menos confiável. */
export function PainelQualidade({ plano, regs, dia }: { plano: PlanoSalvo; regs: readonly Registro[]; dia: string }) {
  const alertas = useMemo<AlertaQualidade[]>(() => qualidadeDosDados(plano, regs, dia), [plano, regs, dia])
  return (
    <Card className="space-y-2.5">
      <h2 className="text-corpo">Qualidade dos dados</h2>
      {alertas.length === 0 ? <p className="flex items-center gap-1.5 text-apoio text-ok"><Icon name="ok" size={16} />Nenhum problema encontrado até a visita de {dataBr(dia)}.</p> : (
        <ul className="space-y-2" aria-label="Alertas de qualidade dos dados">
          {alertas.map((a) => (
            <li key={a.tipo} className={`flex items-start gap-2 rounded-xl p-2.5 text-apoio ${a.gravidade === 'aviso' ? 'bg-warn-soft' : 'bg-surface-2'}`}>
              <Icon name={ICONE_ALERTA[a.gravidade]} size={16} className={`mt-0.5 shrink-0 ${a.gravidade === 'aviso' ? 'text-warn' : 'text-text-2'}`} />
              <span>{a.mensagem}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

interface PropsAnalise { plano: PlanoSalvo; regs: readonly Registro[]; dia: string; dias: readonly string[]; alvo: AlvoId; niveis: ReadonlyMap<string, Nivel>; limite: number | null; calor: CalorHonesto }

/** Painel de análise do alvo: estatística, foco espacial, tendência, distribuição por nível e tabela ponto × visita, com as contas à vista. */
export function PainelAnalise({ plano, regs, dia, dias, alvo, niveis, limite, calor }: PropsAnalise) {
  const unidade = UNIDADE_ALVO[alvo]
  const amostras = useMemo(() => amostrasNaData(regs, dia, alvo), [regs, dia, alvo])
  const d = useMemo(() => descritiva(amostras.map((a) => a.valor)), [amostras])
  const moran = useMemo(() => moranI(amostras), [amostras])
  const serie = useMemo(() => serieTemporal(ateODia(regs, dia).filter((r) => r.alvo === alvo).map((r) => ({ ...r, quantidade: valorDoRegistro(r) }))), [regs, dia, alvo])
  const tend = useMemo(() => tendencia(serie), [serie])
  const dist = useMemo(() => distribuicaoPorNivel(plano.pontos.map((p) => p.id), niveis), [plano, niveis])
  const diasTabela = useMemo(() => dias.slice(-8), [dias])
  const matriz = useMemo(() => matrizPontoVisita(plano, regs, alvo, diasTabela), [plano, regs, alvo, diasTabela])
  const raio = raioDeInfluenciaM(amostras.map((a) => a.posicao))
  if (!d) return null
  const pct = limite !== null ? pctNoLimite(amostras.map((a) => a.valor), limite) : null
  const total = plano.pontos.length

  return (
    <Card className="space-y-5" aria-label={`Análise de ${ALVOS[alvo].nome}`}>
      <h2 className="text-corpo">Análise · {ALVOS[alvo].nome}</h2>

      <dl className="grid grid-cols-3 gap-2">
        {[['Pontos', String(d.n)], ['Média', rotuloValor(Math.round(d.media * 10) / 10)], ['Mediana', rotuloValor(Math.round(d.mediana * 10) / 10)], ['Máximo', rotuloValor(d.max)], ['Desvio', rotuloValor(Math.round(d.desvio * 10) / 10)], ['No nível de ação', pct === null ? '—' : `${pct}%`]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-surface-2 p-2.5"><dd className="text-secao font-bold tabular-nums">{v}</dd><dt className="text-rotulo text-text-2">{k}</dt></div>
        ))}
      </dl>
      <p className="-mt-3 text-rotulo text-text-2">Última leitura de cada ponto até {dataBr(dia)}, em {unidade}.</p>

      <section aria-labelledby="an-foco" className="space-y-1">
        <h3 id="an-foco" className="text-apoio font-semibold">Foco no talhão</h3>
        <p className="text-apoio">{moran.texto}</p>
      </section>

      <section aria-labelledby="an-tend" className="space-y-1">
        <h3 id="an-tend" className="text-apoio font-semibold">Tendência</h3>
        <p className="flex items-start gap-1.5 text-apoio"><Icon name={tend.rumo === 'subindo' ? 'cima' : tend.rumo === 'caindo' ? 'baixo' : 'faixas'} size={16} className="mt-0.5 shrink-0" />{tend.texto}</p>
      </section>

      <section aria-labelledby="an-dist" className="space-y-1.5">
        <h3 id="an-dist" className="text-apoio font-semibold">Pontos por nível</h3>
        <ul className="space-y-1.5">
          {dist.map((x) => (
            <li key={x.nivel} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-2 text-apoio">
              <span>{x.rotulo}</span>
              <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.round((x.n / total) * 100)}%` }} /></span>
              <span className="text-right font-semibold tabular-nums">{x.n}</span>
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-apoio font-semibold">Tabela ponto × visita ({diasTabela.length} {diasTabela.length === 1 ? 'visita' : 'visitas'})</summary>
        <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela ponto por visita (rola para o lado)">
          <table className="w-full min-w-[18rem] text-left text-apoio">
            <thead><tr className="border-b border-line text-text-2"><th scope="col" className="py-1 pr-3 font-semibold">Ponto</th>{diasTabela.map((x) => <th key={x} scope="col" className="pr-3 font-semibold">{x.slice(8)}/{x.slice(5, 7)}<span className="sr-only">/{x.slice(0, 4)}</span></th>)}</tr></thead>
            <tbody>
              {matriz.map((l) => (
                <tr key={l.pontoId} className="border-b border-line">
                  <th scope="row" className="py-1 pr-3 font-semibold">{l.ordem}</th>
                  {l.valores.map((v, k) => <td key={diasTabela[k]} className="pr-3 tabular-nums">{v === null ? <span className="text-text-2" aria-label="sem leitura">–</span> : rotuloValor(v)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-apoio font-semibold">Como estes indicadores são calculados</summary>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-apoio text-text-2">
          <li><b className="text-text">Calor:</b> interpolação por inverso da distância ao quadrado, usando só os pontos a até {raio ? Math.round(raio) : '—'} m da célula ({FATOR_RAIO}× a distância média entre um ponto e o vizinho mais próximo). Fora desse raio a área fica sem dado. Com menos de {MIN_AMOSTRAS_CALOR} pontos não se desenha calor.{calor.motivo === null && <> Hoje o dado cobre {calor.coberturaPct}% do talhão.</>}</li>
          <li><b className="text-text">Foco (índice de Moran I):</b> compara cada ponto com os vizinhos a menos de {raio ? Math.round(raio) : '—'} m. I = (n / S0) · Σ w·(x−x̄)(y−x̄) / Σ(x−x̄)², onde w vale 1 para vizinhos. Esperado ao acaso: −1/(n−1){moran.esperado !== null && <> = {rotuloValor(Math.round(moran.esperado * 100) / 100)}</>}. Considera "agrupado" quando z passa de 1,96 (p &lt; 0,05, sob normalidade). Precisa de {MIN_PONTOS_MORAN} pontos ou mais; aqui n = {moran.n}{moran.vizinhosMedios !== null && <>, em média {rotuloValor(Math.round(moran.vizinhosMedios * 10) / 10)} vizinhos por ponto</>}. É um indicador para priorizar inspeção, não uma prova.</li>
          <li><b className="text-text">Tendência:</b> média das leituras da última visita contra a anterior; variação de até ±10% (sobre a média anterior, no mínimo 1) conta como estável.</li>
          <li><b className="text-text">Valor atípico:</b> mais de {FATOR_ATIPICO}× a média dos outros pontos, com pelo menos {MIN_PONTOS_ATIPICO} pontos. <b className="text-text">GPS impreciso:</b> pior que ±{SINAL_FRACO_M} m. <b className="text-text">Longe do ponto:</b> mais de {LIMIAR_LONGE_DO_PONTO_M} m do ponto planejado.</li>
        </ul>
      </details>
    </Card>
  )
}
