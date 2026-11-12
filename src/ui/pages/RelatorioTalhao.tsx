import { Link, useParams } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useFotoUrl } from '@/data/fotos'
import { useFazenda, usePendencias, usePlano, useRegistros, useRegistrosComHistorico, useTalhoes } from '@/data/hooks'
import { avaliarRegistro } from '@/domain/analise'
import { descritiva, pctNoLimite } from '@/domain/estatistica'
import { nomeDoArquivo, nomeDoRelatorio, registrosParaCsv, registrosParaGeoJson } from '@/domain/exportar'
import { camposDoRegistro, coordenada, estadoDaVersao, linhaDoTempoDoPonto, medidaDoRegistro, rastroDaVersao, resumoPorPonto } from '@/domain/ficha'
import { rotuloDiagnostico } from '@/domain/funil'
import { panorama } from '@/domain/panorama'
import { ROTULO_ESTADO, type EstadoPonto } from '@/domain/ponto'
import { PROTOCOLO_VERSAO } from '@/domain/registro'
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

function Foto({ id }: { id: string }) {
  const url = useFotoUrl(id)
  return <div className="size-24 overflow-hidden rounded-lg bg-surface-2 ring-1 ring-line print:size-[28mm]">{url && <img src={url} alt="Foto de evidência do ponto" className="size-full object-cover" />}</div>
}

/** Bolinha com a cor do estado do ponto, igual à do mapa. */
const Bolinha = ({ estado }: { estado: EstadoPonto }) => <span aria-hidden className="inline-block size-3 shrink-0 rounded-full border border-line align-middle" style={{ background: COR_ESTADO[estado].fundo }} />

/**
 * Relatório completo do talhão para avaliação técnica: capa com croqui numerado, resumo, resultado por alvo, tabela dos pontos e
 * uma ficha por ponto com data, hora, método, amostra, condições, responsável, posição, fotos e histórico de correções.
 * O PDF sai pelo próprio navegador ("Salvar como PDF"), sem biblioteca, e funciona offline.
 */
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
    return { pan, dias, ultima, porEstado, alvos, resumoPontos: resumoPorPonto(plano, regs, pan.estados) }
  }, [talhao, plano, regs, pend])

  if (talhoes === undefined || plano === undefined && talhao === undefined) return null
  if (!talhao) return <Vazio icone="mapa" titulo="Este talhão não existe mais" texto="Ele pode ter sido apagado deste aparelho." acao={<Link to="/talhoes" className="font-semibold text-brand">Ver talhões</Link>} />
  if (!plano || !dados || !regs || !todos || !pend) return <Vazio icone="mapa" titulo="Este talhão ainda não tem plano" texto="Gere o plano de pontos para ter o relatório." acao={<Link to="/talhoes" className="font-semibold text-brand">Ir para Talhões</Link>} />

  const fuso = fazenda.fuso
  const fontesUsadas = [...new Set(LISTA_ALVOS.flatMap((a) => a.fontes))]
  const csv = () => baixarTexto(nomeDoArquivo(talhao, geradoEm, 'csv', fuso), registrosParaCsv(todos, talhao, plano), 'text/csv')
  const geo = () => baixarTexto(nomeDoArquivo(talhao, geradoEm, 'geojson', fuso), JSON.stringify(registrosParaGeoJson(todos, talhao, plano, geradoEm), null, 2), 'application/geo+json')

  /** Abre o diálogo do navegador já com o nome do arquivo sugerido; a pessoa escolhe "Salvar como PDF". */
  async function gerarPdf() {
    const tituloAntes = document.title
    document.title = nomeDoRelatorio(talhao!, geradoEm, fuso) // o navegador sugere o título da página como nome do arquivo
    const restaurar = () => { document.title = tituloAntes; window.removeEventListener('afterprint', restaurar) }
    window.addEventListener('afterprint', restaurar)
    await Promise.all([...document.images].map((i) => (i.complete ? undefined : i.decode().catch(() => undefined)))) // fotos carregadas antes de imprimir
    window.print()
  }

  const totalRegistros = todos.length
  const pontosOrdenados = [...plano.pontos].sort((a, b) => a.order - b.order)

  return (
    <article className="mx-auto max-w-4xl space-y-7 print:max-w-none print:space-y-5 print:text-[10.5pt]" aria-label={`Relatório do talhão ${talhao.nome}`}>
      <div className="space-y-2 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/talhoes/$id" params={{ id: talhao.id }} className="inline-flex min-h-11 items-center font-semibold text-brand">← Voltar ao talhão</Link>
          <div className="flex flex-wrap gap-2">
            <Button icon="livro" onClick={() => void gerarPdf()}>Gerar PDF</Button>
            <Button variant="secondary" onClick={csv}>Baixar CSV</Button>
            <Button variant="secondary" onClick={geo}>Baixar GeoJSON</Button>
          </div>
        </div>
        <p className="text-apoio text-text-2">Na janela que abrir, escolha <b>Salvar como PDF</b> como destino. O arquivo já sai com o nome do talhão e a data.</p>
      </div>

      <header className="border-b border-line pb-4">
        <p className="text-apoio text-text-2">Sentinela · Relatório de monitoramento fitossanitário de soja</p>
        <h1 className="mt-1 text-titulo">{talhao.nome}</h1>
        <p className="mt-1 text-apoio text-text-2">{fazenda.nome} · {fazenda.municipio} · {fazenda.uf} · Safra {fazenda.safra}</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-apoio sm:grid-cols-4">
          <div><dt className="text-text-2">Área</dt><dd className="font-semibold">{fmt(plano.areaHa)} ha</dd></div>
          <div><dt className="text-text-2">Cultivar</dt><dd className="font-semibold">{talhao.cultivar}</dd></div>
          <div><dt className="text-text-2">Plantio</dt><dd className="font-semibold">{dataBr(talhao.dataPlantio)}</dd></div>
          <div><dt className="text-text-2">Estádio</dt><dd className="font-semibold">{talhao.estadio}</dd></div>
          <div><dt className="text-text-2">Pontos de coleta</dt><dd className="font-semibold">{plano.pontos.length}</dd></div>
          <div><dt className="text-text-2">Registros</dt><dd className="font-semibold">{totalRegistros}</dd></div>
          <div className="col-span-2"><dt className="text-text-2">Gerado em</dt><dd className="font-semibold">{dataHoraBr(geradoEm, fuso)} (horário local, fuso {fuso})</dd></div>
        </dl>
      </header>

      <section aria-labelledby="r-resumo" className="grid gap-5 sm:grid-cols-[17rem_1fr] print:break-inside-avoid">
        <MiniTalhao anel={talhao.anel} pontos={plano.pontos} estados={dados.pan.estados} numerar className="aspect-square w-full max-w-72 rounded-xl bg-surface-2 print:border print:border-line" />
        <div>
          <h2 id="r-resumo" className="text-secao">Resumo</h2>
          <p className="mt-1 text-corpo">{dados.pan.coletados} de {dados.pan.total} pontos coletados{dados.ultima ? ` · última visita em ${dataBr(dados.ultima)}` : ' · ainda sem visitas'}.</p>
          <p className="text-corpo">{dados.pan.emAtencao} {dados.pan.emAtencao === 1 ? 'ponto em atenção' : 'pontos em atenção'}{dados.pan.alvoDominante ? ` (principalmente ${ALVOS[dados.pan.alvoDominante].nome}${dados.pan.setor ? `, ${dados.pan.setor === 'centro' ? 'no centro do talhão' : `no ${dados.pan.setor}`}` : ''})` : ''}.</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-apoio" aria-label="Legenda e contagem por estado">
            {ESTADOS.filter((e) => dados.porEstado.get(e)).map((e) => <li key={e} className="flex items-center gap-1.5"><Bolinha estado={e} />{ROTULO_ESTADO[e]}: <b>{dados.porEstado.get(e)}</b></li>)}
          </ul>
          <p className="mt-2 text-rotulo text-text-2">Os números no croqui são os números dos pontos; a cor é o estado do ponto.</p>
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

      <section aria-labelledby="r-pontos">
        <h2 id="r-pontos" className="text-secao">Pontos do talhão</h2>
        <div className="mt-2 overflow-x-auto" tabIndex={0} role="region" aria-label="Tabela dos pontos (rola para o lado)">
          <table className="w-full min-w-[40rem] text-left text-apoio print:text-[9.5pt]">
            <thead><tr className="border-b border-line text-text-2"><th className="py-1.5 pr-3 font-semibold">Ponto</th><th className="pr-3 font-semibold">Estado</th><th className="pr-3 font-semibold">Coordenada planejada (lat / lon)</th><th className="pr-3 font-semibold">Registros</th><th className="font-semibold">Última leitura</th></tr></thead>
            <tbody>
              {dados.resumoPontos.map((p) => (
                <tr key={p.pontoId} className="border-b border-line align-top print:break-inside-avoid">
                  <th scope="row" className="py-1.5 pr-3 font-semibold">{p.ordem}</th>
                  <td className="pr-3"><span className="inline-flex items-center gap-1.5"><Bolinha estado={p.estado} />{ROTULO_ESTADO[p.estado]}</span></td>
                  <td className="pr-3 whitespace-nowrap tabular-nums">{coordenada(p.planejada[1])} / {coordenada(p.planejada[0])}</td>
                  <td className="pr-3 tabular-nums">{p.registros}</td>
                  <td className="whitespace-nowrap">{p.ultimo ? dataHoraBr(p.ultimo.criadoEm, p.ultimo.fusoHorario ?? fuso) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="r-fichas" className="space-y-5">
        <div>
          <h2 id="r-fichas" className="text-secao">Fichas dos pontos</h2>
          <p className="mt-1 text-apoio text-text-2">Cada registro com data e hora, método de coleta, amostra, condições, responsável, posição, fotos e histórico de correções. Em ordem de data, do mais antigo ao mais recente. Correções e registros desfeitos aparecem marcados; nada é apagado.</p>
        </div>
        {pontosOrdenados.map((p) => {
          const estado = dados.pan.estados.get(p.id) ?? 'a_coletar'
          const itens = linhaDoTempoDoPonto(todos.filter((r) => r.pontoId === p.id), pend.filter((x) => x.pontoId === p.id)).reverse()
          return (
            <article key={p.id} aria-label={`Ficha do ponto ${p.order}`} data-ponto={p.order} className="space-y-2.5">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line pb-1.5 print:break-after-avoid">
                <h3 className="text-subtitulo">Ponto {p.order}</h3>
                <span className="inline-flex items-center gap-1.5 text-apoio font-semibold"><Bolinha estado={estado} />{ROTULO_ESTADO[estado]}</span>
                <span className="text-apoio text-text-2 tabular-nums">planejado em {coordenada(p.position[1])} / {coordenada(p.position[0])}</span>
              </header>
              {itens.length === 0 ? <p className="text-apoio text-text-2">Sem registros neste ponto.</p> : itens.map((e) => {
                if (!e.registro) {
                  const x = e.pendencia!
                  return (
                    <div key={x.id} data-achado className="rounded-xl border border-line p-3 print:break-inside-avoid">
                      <div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-semibold">Achado guardado para diagnóstico</p><p className="text-apoio text-text-2 tabular-nums">{dataHoraBr(x.criadoEm, fuso)}</p></div>
                      <p className="mt-1 text-apoio">Guardado por {x.amostrador} no estádio {x.estadio}.{x.nota ? ` ${x.nota}` : ''}</p>
                      {x.resolvida && <p className="mt-1 text-apoio"><b>Diagnóstico:</b> {rotuloDiagnostico(x.resolvida)} ({dataHoraBr(x.resolvida.em, fuso)})</p>}
                      {x.fotoIds.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{x.fotoIds.map((f) => <li key={f}><Foto id={f} /></li>)}</ul>}
                    </div>
                  )
                }
                const r = e.registro
                const estadoV = estadoDaVersao(r)
                const a = avaliarRegistro(r)
                const rastro = rastroDaVersao(r)
                const campos = camposDoRegistro(r, true)
                return (
                  <div key={r.id} data-registro data-estado={estadoV} className={`rounded-xl border border-line p-3 print:break-inside-avoid print:p-2 ${estadoV === 'ativa' ? '' : 'bg-surface-2'}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <p className="font-semibold">{ALVOS[r.alvo].nome}{(r.versao ?? 1) > 1 && <span className="font-normal text-text-2"> · versão {r.versao}</span>}{estadoV !== 'ativa' && <span className="font-normal text-text-2"> · {estadoV === 'corrigida' ? 'substituída por correção' : 'desfeita'}</span>}</p>
                      <p className="text-apoio font-semibold tabular-nums">{dataHoraBr(r.criadoEm, r.fusoHorario ?? fuso)}</p>
                    </div>
                    <p className="mt-0.5 text-corpo"><b>{medidaDoRegistro(r)}</b>{estadoV === 'ativa' && !r.zero && <span className="text-text-2"> · {a.titulo}</span>}</p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-apoio print:mt-1 print:grid-cols-[auto_1fr_auto_1fr] print:gap-x-4 print:gap-y-0 print:text-[9pt]">
                      {[...campos.filter((c) => !c.largo), ...campos.filter((c) => c.largo), { chave: 'fonte', rotulo: 'Fonte da decisão', valor: a.fontes.map((f) => FONTES[f].rotulo).join(' · '), largo: true }].map((c) => (
                        c.largo
                          ? <div key={c.chave} className="col-span-full grid grid-cols-subgrid"><dt className="text-text-2">{c.rotulo}</dt><dd className="min-w-0 break-words print:col-span-3">{c.valor}</dd></div>
                          : <div key={c.chave} className="contents"><dt className="text-text-2">{c.rotulo}</dt><dd className="min-w-0 break-words">{c.valor}</dd></div>
                      ))}
                    </dl>
                    {r.fotoIds.length > 0 && <ul className="mt-2 flex flex-wrap gap-2" aria-label="Fotos deste registro">{r.fotoIds.map((f) => <li key={f}><Foto id={f} /></li>)}</ul>}
                    {rastro && <p className="mt-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-rotulo text-text-2">{rastro}</p>}
                  </div>
                )
              })}
            </article>
          )
        })}
      </section>

      <section aria-labelledby="r-metodo" className="print:break-inside-avoid">
        <h2 id="r-metodo" className="text-secao">Método de coleta</h2>
        <ul className="mt-2 space-y-1.5 text-apoio">
          {LISTA_ALVOS.map((a) => <li key={a.id}><b>{a.nome}:</b> {a.coleta.metodo}. <span className="text-text-2">Unidade: {a.coleta.unidade}.</span></li>)}
        </ul>
        <p className="mt-2 text-rotulo text-text-2">Versão do protocolo: {PROTOCOLO_VERSAO}. Registros anteriores à versão 2 do app não guardam o método e aparecem como "Método não informado".</p>
      </section>

      <section aria-labelledby="r-fontes" className="print:break-inside-avoid">
        <h2 id="r-fontes" className="text-secao">Fontes</h2>
        <ul className="mt-2 space-y-1 text-apoio">{fontesUsadas.map((f) => <li key={f}>{FONTES[f].citacao}</li>)}</ul>
        <p className="mt-3 rounded-xl bg-surface-2 p-3 text-apoio text-text-2">O Sentinela apoia a decisão, não a substitui: este relatório não recomenda a aplicação de defensivos. A decisão é do agrônomo responsável. Datas e horas no fuso {fuso}; relatório gerado em {diaLocal(geradoEm, fuso).split('-').reverse().join('/')}.</p>
      </section>
    </article>
  )
}
