import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { mensagemDeGravacao } from '@/data/erros'
import { useRegistrosComHistorico, useTalhoes } from '@/data/hooks'
import { repo } from '@/data/repo'
import type { Talhao } from '@/domain/entidades'
import { nomeDoArquivo, registrosParaCsv } from '@/domain/exportar'
import { ESTADIOS } from '@/domain/phenology'
import { confirmaExclusao, CULTIVAR_MAX, NOME_MAX, validarDadosTalhao, type DadosDoTalhao } from '@/domain/talhao'
import { diaLocal } from '@/domain/tempo'
import { baixarTexto } from '../baixar'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import { Button, Campo, Input, Segmentado, Select } from './kit'

/** Editar os dados do talhão. O contorno, o plano e os registros não mudam. */
export function EditarTalhao({ talhao, onFechar, onApagar }: { talhao: Talhao; onFechar: () => void; onApagar: () => void }) {
  const mostrar = useToast((s) => s.mostrar)
  const talhoes = useTalhoes()
  const [d, setD] = useState<DadosDoTalhao>({ nome: talhao.nome, cultivar: talhao.cultivar === 'Não informada' ? '' : talhao.cultivar, dataPlantio: talhao.dataPlantio, estadio: talhao.estadio, finalidade: talhao.finalidade })
  const [tocou, setTocou] = useState(false) // só mostra erro depois que a pessoa mexeu: abrir o formulário não deve "gritar"
  const [salvando, setSalvando] = useState(false)
  const [erroDoBanco, setErroDoBanco] = useState<string | null>(null)
  const [hoje] = useState(() => diaLocal(new Date()))

  const outros = (talhoes ?? []).filter((t) => t.id !== talhao.id).map((t) => t.nome)
  const v = validarDadosTalhao(d, outros, hoje)
  const mudou = d.nome.trim() !== talhao.nome || (d.cultivar.trim() || 'Não informada') !== talhao.cultivar || d.dataPlantio !== talhao.dataPlantio || d.estadio !== talhao.estadio || d.finalidade !== talhao.finalidade
  const muda = <K extends keyof DadosDoTalhao>(k: K, valor: DadosDoTalhao[K]) => { setTocou(true); setErroDoBanco(null); setD((x) => ({ ...x, [k]: valor })) }
  const erro = (k: keyof typeof v.erros) => (tocou ? v.erros[k] : undefined)

  async function salvar() {
    if (!v.ok || !mudou || salvando) return
    setSalvando(true)
    try {
      const r = await repo.atualizarTalhao(talhao.id, d)
      if (!r.ok) { setErroDoBanco(Object.values(r.erros)[0] ?? 'Não foi possível salvar.'); return }
      mostrar('Talhão atualizado')
      onFechar()
    } catch (e) {
      setErroDoBanco(mensagemDeGravacao(e, 'Não foi possível salvar as alterações. Tente de novo.'))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-apoio text-text-2">O contorno no mapa e os pontos de coleta não mudam. Os registros já feitos continuam com o estádio da época em que foram coletados.</p>
      <Campo rotulo="Nome do talhão" {...(erro('nome') ? { erro: erro('nome')! } : {})}><Input value={d.nome} maxLength={NOME_MAX + 10} onChange={(e) => muda('nome', e.target.value)} autoFocus /></Campo>
      <Campo rotulo="Cultivar" ajuda="Pode ficar em branco." {...(erro('cultivar') ? { erro: erro('cultivar')! } : {})}><Input value={d.cultivar} maxLength={CULTIVAR_MAX + 10} onChange={(e) => muda('cultivar', e.target.value)} placeholder="Ex.: precoce" /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Data de plantio" {...(erro('dataPlantio') ? { erro: erro('dataPlantio')! } : {})}><Input type="date" value={d.dataPlantio} max={hoje} onChange={(e) => muda('dataPlantio', e.target.value)} /></Campo>
        <Campo rotulo="Estádio atual"><Select value={d.estadio} onChange={(e) => muda('estadio', e.target.value)}>{ESTADIOS.map((e) => <option key={e}>{e}</option>)}</Select></Campo>
      </div>
      <Campo grupo rotulo="Finalidade">
        <Segmentado rotulo="Finalidade" valor={d.finalidade} onChange={(f) => muda('finalidade', f)} opcoes={[{ id: 'graos', nome: 'Grãos' }, { id: 'sementes', nome: 'Sementes' }]} />
      </Campo>
      {erroDoBanco && <p role="alert" className="text-apoio text-danger">{erroDoBanco}</p>}
      <div className="grid gap-2.5"><Button block icon="check" disabled={!v.ok || !mudou || salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar alterações'}</Button><Button block variant="secondary" onClick={onFechar}>Cancelar</Button></div>
      <div className="border-t border-line pt-4">
        <p className="text-apoio text-text-2">Não precisa mais deste talhão?</p>
        <Button block variant="danger" className="mt-2" icon="lixo" onClick={onApagar}>Apagar este talhão…</Button>
      </div>
    </div>
  )
}

interface Resumo { pontos: number; registros: number; achados: number; fotos: number }

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/** Confirmação para apagar o talhão: mostra o que será perdido, oferece o CSV e só libera depois de digitar o nome. */
export function ApagarTalhao({ talhao, onFechar }: { talhao: Talhao; onFechar: () => void }) {
  const mostrar = useToast((s) => s.mostrar)
  const navegar = useNavigate()
  const todos = useRegistrosComHistorico(talhao.id)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [digitado, setDigitado] = useState('')
  const [apagando, setApagando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    void repo.resumoDoTalhao(talhao.id).then((r) => { if (vivo) setResumo(r) })
    return () => { vivo = false }
  }, [talhao.id])

  async function baixarCsv() {
    const plano = await repo.obterPlano(talhao.id)
    if (!todos) return
    baixarTexto(nomeDoArquivo(talhao, new Date(), 'csv'), registrosParaCsv(todos, talhao, plano), 'text/csv')
    mostrar('CSV baixado. Guarde o arquivo antes de apagar.')
  }

  async function apagar() {
    if (!confirmaExclusao(digitado, talhao.nome) || apagando) return
    setApagando(true)
    try {
      await repo.apagarTalhao(talhao.id)
      if (useSessao.getState().talhaoId === talhao.id) useSessao.getState().setTalhao(null)
      mostrar(`${talhao.nome} foi apagado`)
      void navegar({ to: '/talhoes' })
    } catch (e) {
      setErro(mensagemDeGravacao(e, 'Não foi possível apagar o talhão. Nada foi apagado; tente de novo.'))
      setApagando(false)
    }
  }

  const liberado = confirmaExclusao(digitado, talhao.nome) && !apagando
  return (
    <div className="space-y-4">
      <div role="alert" className="rounded-2xl border border-danger bg-danger-soft p-4">
        <p className="font-semibold text-danger">Isto não pode ser desfeito.</p>
        <p className="mt-1 text-apoio">Você vai apagar <b>{talhao.nome}</b> deste aparelho, com tudo o que é dele:</p>
        {resumo ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-apoio" aria-label="O que será apagado">
            <li>{plural(resumo.pontos, 'ponto de coleta', 'pontos de coleta')}</li>
            <li>{plural(resumo.registros, 'registro', 'registros')} (incluindo correções e desfeitos)</li>
            <li>{plural(resumo.achados, 'achado guardado', 'achados guardados')}</li>
            <li>{plural(resumo.fotos, 'foto', 'fotos')}</li>
          </ul>
        ) : <p className="mt-2 text-apoio text-text-2">Contando…</p>}
      </div>
      <div>
        <Button variant="secondary" block icon="download" disabled={!todos || (resumo?.registros ?? 0) === 0} onClick={() => void baixarCsv()}>Baixar CSV antes de apagar</Button>
        <p className="mt-1.5 text-rotulo text-text-2">Guarda todos os registros em um arquivo que abre no Excel.</p>
      </div>
      <Campo rotulo="Para confirmar, digite o nome do talhão" ajuda={talhao.nome}>
        <Input value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder={talhao.nome} autoComplete="off" autoCapitalize="off" spellCheck={false} />
      </Campo>
      {erro && <p role="alert" className="text-apoio text-danger">{erro}</p>}
      <div className="grid gap-2.5"><Button block variant="danger" icon="lixo" disabled={!liberado} onClick={() => void apagar()}>{apagando ? 'Apagando…' : 'Apagar definitivamente'}</Button><Button block variant="secondary" onClick={onFechar}>Cancelar</Button></div>
    </div>
  )
}
