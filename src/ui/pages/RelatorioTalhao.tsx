import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFazenda, usePendencias, usePlano, useRegistros, useRegistrosComHistorico, useTalhoes } from '@/data/hooks'
import { avaliarRegistro } from '@/domain/analise'
import { NOME_FAZENDA_PADRAO } from '@/domain/entidades'
import { descritiva, pctNoLimite } from '@/domain/estatistica'
import { nomeDoArquivo, registrosParaCsv, registrosParaGeoJson } from '@/domain/exportar'
import { medidaDoRegistro, posicaoDoRegistro } from '@/domain/ficha'
import { panorama } from '@/domain/panorama'
import { ROTULO_ESTADO, type EstadoPonto } from '@/domain/ponto'
import { PROTOCOLO_VERSAO, metodoDoRegistro } from '@/domain/registro'
import { amostrasNaData, LIMITE_ACAO, UNIDADE_ALVO, visitas } from '@/domain/resultados'
import { dataBr, dataHoraBr, diaLocal } from '@/domain/tempo'
import { ALVOS, LISTA_ALVOS } from '@/knowledge/alvos'
import { FONTES } from '@/knowledge/fontes'
import { baixarTexto } from '../baixar'
import { Button, Vazio } from '../components/kit'
import { MiniTalhao } from '../components/MiniTalhao'
import { COR_ESTADO } from '../components/estadoPonto'

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ','))
const ESTADOS: EstadoPonto[] = ['sem_ocorrencia', 'leve', 'acao', 'doenca', 'diagnostico', 'diagnosticado', 'a_coletar']

/** Relatório do talhão para avaliação técnica, pronto para imprimir ou salvar em PDF (o navegador gera o PDF). */
export function RelatorioTalhao() {
  const { id } = useParams({ from: '/talhoes/$id/relatorio' })
  const talhoes = useTalhoes()
  const talhao = talhoes?.find((t) => t.id === id)
  const plano = usePlano(id)
  const regs = useRegistros(id)
  const todos = useRegistrosComHistorico(id)
  const pend = usePendencias(id)
  const fazenda = useFazenda()
  const [geradoEm] = useState(() => new Date())

  const dados = useMemo(() => {
    if (!talhao || !plano || !regs || !pend) return null
    const pan = panorama(plano, regs, pend, talhao.anel)
    const dias = visitas(regs)
    const ultima = dias[dias.length - 1] ?? null
    const porEstado = new Map<EstadoPonto, number>()
    for (const e of pan.estados.values()) porEstado.set(e, (porEstado.get(e) ?? 0) + 1)
    const alvos = LISTA_ALVOS.map((a) => {
      const amostras = ultima ? amostrasNaData(regs, ultima, a.id) : []
      const valores = amostras.map((x) => x.valor)
      const lim = LIMITE_ACAO[a.id]
      return { alvo: a, desc: descritiva(valores), limite: lim, pctAcima: lim !== undefined ? pctNoLimite(valores, lim) : null }
    }).filter((x) => x.desc)
    return { pan, dias, ultima, porEstado, alvos }
  }, [talhao, plano, regs, pend])

  if (talhoes === undefined || plano === undefined && talhao === undefined) return null
  if (!talhao) return <Vazio icone="mapa" titulo="Este talhão não existe mais" texto="Ele pode ter sido apagado deste aparelho." acao={<Link to="/talhoes" className="font-semibold text-brand">Ver talhões</Link>} />
  if (!plano || !dados || !regs || !todos) return <Vazio icone="mapa" titulo="Este talhão ainda não tem plano" texto="Gere o plano de pontos para ter o relatório." acao={<Link to="/talhoes" className="font-semibold text-brand">Ir para Talhões</Link>} />

  const fuso = fazenda?.fuso
  const ordem = new Map(plano.pontos.map((p) => [p.id, p.order]))
  const registrosOrdenados = [...regs].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm) || (ordem.get(a.pontoId) ?? 0) - (ordem.get(b.pontoId) ?? 0))
  const fontesUsadas = [...new Set(LISTA_ALVOS.flatMap((a) => a.fontes))]
  const csv = () => baixarTexto(nomeDoArquivo(talhao, geradoEm, 'csv', fuso), registrosParaCsv(todos, talhao, plano), 'text/csv')
  const geo = () => baixarTexto(nomeDoArquivo(talhao, geradoEm, 'geojson', fuso), JSON.stringify(registrosParaGeoJson(todos, talhao, plano, geradoEm), null, 2), 'application/geo+json')

  return (
    <article className="mx-auto max-w-4xl space-y-6 print:max-w-none print:space-y-4 print:text-[11pt]" aria-label={`Relatório do talhão ${talhao.nome}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/talhoes/$id" params={{ id: talhao.id }} className="inline-flex min-h-11 items-center font-semibold text-brand">← Voltar ao talhão</Link>
        <div className="flex flex-wrap gap-2">
          <Button icon="livro" onClick={() => window.print()}>Imprimir / Salvar como PDF</Button>
          <Button variant="secondary" onClick={csv}>Baixar CSV</Button>
          <Button variant="secondary" onClick={geo}>Baixar GeoJSON</Button>
        </div>
      </div>

      <header className="border-b border-line pb-4">
        <p className="text-apoio text-text-2">Sentinela · Relatório de monitoramento fitossanitário de soja</p>
        <h1 className="mt-1 text-titulo">{talhao.nome}</h1>
        <p className="mt-1 text-apoio text-text-2">{fazenda?.nome ?? NOME_FAZENDA_PADRAO}{fazenda?.municipio ? ` · ${fazenda.municipio}${fazenda.uf ? ` · ${fazenda.uf}` : ''}` : ''}{fazenda?.safra ? ` · Safra ${fazenda.safra}` : ''}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-apoio sm:grid-cols-4">
          <div><dt className="text-text-2">Área</dt><dd className="font-semibold">{fmt(plano.areaHa)} ha</dd></div>
          <div><dt className="text-text-2">Cultivar</dt><dd className="font-semibold">{talhao.cultivar}</dd></div>
          <div><dt className="text-text-2">Plantio</dt><dd className="font-semibold">{dataBr(talhao.dataPlantio)}</dd></div>
          <div><dt className="text-text-2">Estádio</dt><dd className="font-semibold">{talhao.estadio}</dd></div>
          {fazenda?.responsavelTecnico && <div className="col-span-2"><dt className="text-text-2">Responsável técnico</dt><dd className="font-semibold">{fazenda.responsavelTecnico}</dd></div>}
          <div className="col-span-2"><dt className="text-text-2">Gerado em</dt><dd className="font-semibold">{dataHoraBr(geradoEm, fuso)} (horário local)</dd></div>
        </dl>
      </header>

      <section aria-labelledby="r-resumo" className="grid gap-5 sm:grid-cols-[14rem_1fr] print:break-inside-avoid">
        <MiniTalhao anel={talhao.anel} pontos={plano.pontos} estados={dados.pan.estados} className="aspect-square w-full max-w-60 rounded-xl bg-surface-2 print:border print:border-line" />
        <div>
          <h2 id="r-resumo" className="text-secao">Resumo</h2>
          <p className="mt-1 text-corpo">{dados.pan.coletados} de {dados.pan.total} pontos coletados{dados.ultima ? ` · última visita em ${dataBr(dados.ultima)}` : ' · ainda sem visitas'}.</p>
          <p className="text-corpo">{dados.pan.emAtencao} {dados.pan.emAtencao === 1 ? 'ponto em atenção' : 'pontos em atenção'}{dados.pan.alvoDominante ? ` (principalmente ${ALVOS[dados.pan.alvoDominante].nome}${dados.pan.setor ? `, ${dados.pan.setor === 'centro' ? 'no centro do talhão' : `no ${dados.pan.setor}`}` : ''})` : ''}.</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-apoio" aria-label="Legenda e contagem por estado">
            {ESTADOS.filter((e) => dados.porEstado.get(e)).map((e) => <li key={e} className="flex items-center gap-1.5"><span className="size-3.5 rounded-full border border-line" style={{ background: COR_ESTADO[e].fundo }} />{ROTULO_ESTADO[e]}: <b>{dados.porEstado.get(e)}</b></li>)}
          </ul>
        </div>
      </section>

      <section aria-labelledby="r-alvos" className="print:break-inside-avoid">
        <h2 id="r-alvos" className="text-secao">Resultado por alvo (última leitura de cada ponto)</h2>
        {dados.alvos.length === 0 ? <p className="mt-2 text-text-2">Sem leituras neste talhão.</p> : (
          <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de resultado por alvo (rola para o lado)">
            <table className="w-full min-w-[34rem] text-left text-apoio">
              <thead><tr className="border-b border-line text-text-2"><th className="py-1.5 pr-3 font-semibold">Alvo</th><th className="pr-3 font-semibold">Pontos</th><th className="pr-3 font-semibold">Média</th><th className="pr-3 font-semibold">Mediana</th><th className="pr-3 font-semibold">Máximo</th><th className="pr-3 font-semibold">Nível de ação</th><th className="font-semibold">Pontos no nível</th></tr></thead>
              <tbody>
                {dados.alvos.map(({ alvo, desc, limite, pctAcima }) => (
                  <tr key={alvo.id} className="border-b border-line">
                    <td className="py-1.5 pr-3 font-semibold">{alvo.nome}</td><td className="pr-3">{desc!.n}</td>
                    <td className="pr-3">{fmt(desc!.media)} {UNIDADE_ALVO[alvo.id]}</td><td className="pr-3">{fmt(desc!.mediana)}</td><td className="pr-3">{fmt(desc!.max)}</td>
                    <td className="pr-3">{limite !== undefined ? `${limite} ${UNIDADE_ALVO[alvo.id]}` : 'sem valor numérico'}</td><td>{pctAcima !== null ? `${pctAcima}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="r-regs">
        <h2 id="r-regs" className="text-secao">Registros ({registrosOrdenados.length})</h2>
        {registrosOrdenados.length === 0 ? <p className="mt-2 text-text-2">Nenhum registro neste talhão.</p> : (
          <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela de registros (rola para o lado)">
            <table className="w-full min-w-[44rem] text-left text-apoio print:text-[9pt]">
              <thead><tr className="border-b border-line text-text-2"><th className="py-1.5 pr-3 font-semibold">Data e hora</th><th className="pr-3 font-semibold">Ponto</th><th className="pr-3 font-semibold">Alvo</th><th className="pr-3 font-semibold">Medida</th><th className="pr-3 font-semibold">Decisão</th><th className="pr-3 font-semibold">Coletado por</th><th className="font-semibold">Posição</th></tr></thead>
              <tbody>
                {registrosOrdenados.map((r) => (
                  <tr key={r.id} className="border-b border-line align-top print:break-inside-avoid">
                    <td className="py-1.5 pr-3 whitespace-nowrap">{dataHoraBr(r.criadoEm, r.fusoHorario ?? fuso)}</td><td className="pr-3">{ordem.get(r.pontoId) ?? r.pontoId}</td><td className="pr-3">{ALVOS[r.alvo].nome}</td>
                    <td className="pr-3">{medidaDoRegistro(r)}</td><td className="pr-3">{avaliarRegistro(r).titulo}</td><td className="pr-3">{r.amostrador}</td><td>{posicaoDoRegistro(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-rotulo text-text-2">Só as versões em vigor. Correções e registros desfeitos estão no CSV e no GeoJSON, com o estado de cada versão.</p>
      </section>

      <section aria-labelledby="r-metodo" className="print:break-inside-avoid">
        <h2 id="r-metodo" className="text-secao">Método de coleta</h2>
        <ul className="mt-2 space-y-1.5 text-apoio">
          {LISTA_ALVOS.map((a) => <li key={a.id}><b>{a.nome}:</b> {a.coleta.metodo}. <span className="text-text-2">Unidade: {a.coleta.unidade}.</span></li>)}
        </ul>
        <p className="mt-2 text-rotulo text-text-2">Versão do protocolo: {PROTOCOLO_VERSAO}. Registros anteriores à versão 2 do app não guardam o método ({metodoDoRegistro({})}).</p>
      </section>

      <section aria-labelledby="r-fontes" className="print:break-inside-avoid">
        <h2 id="r-fontes" className="text-secao">Fontes</h2>
        <ul className="mt-2 space-y-1 text-apoio">{fontesUsadas.map((f) => <li key={f}>{FONTES[f].citacao}</li>)}</ul>
        <p className="mt-3 rounded-xl bg-surface-2 p-3 text-apoio text-text-2">O Sentinela apoia a decisão, não a substitui: este relatório não recomenda a aplicação de defensivos. A decisão é do agrônomo responsável. Datas e horas no fuso {fuso ?? 'America/Cuiaba'}; dia {diaLocal(geradoEm, fuso)}.</p>
      </section>
    </article>
  )
}
