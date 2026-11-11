import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { anexarDiagnostico } from '@/data/coleta'
import { usePlano, useTalhoes } from '@/data/hooks'
import { percentual, type Classificado, type Confianca } from '@/domain/funil'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import { Button, Campo, Folha, Input, Select } from './kit'


interface Props {
  aberta: boolean
  onFechar: () => void
  ranking: Classificado[]
  /** Confiança no primeiro colocado. Se o usuário escolher outra causa, grava "ainda incerto". */
  confianca: Confianca
  /** Respostas + fotos escolhidas, para limitar o percentual salvo. */
  evidencias: number
  /** Talhão já escolhido no início (ou o do achado guardado). */
  talhaoId: string | null
  /** Achado guardado na Coleta: talhão e ponto já definidos, sem perguntar de novo. */
  achado: { pontoId: string; pendenciaId: string } | null
}

/** Grava o diagnóstico escolhido num ponto de coleta. Com um achado guardado, é um toque; sem ele, escolhe talhão e ponto. */
export function SalvarDiagnostico({ aberta, onFechar, ranking, confianca, evidencias, talhaoId, achado }: Props) {
  const navegar = useNavigate()
  const mostrar = useToast((s) => s.mostrar)
  const { setTalhao, amostrador, setAmostrador, setDiagnosticoPara, setPontoFoco } = useSessao()
  const talhoes = useTalhoes()
  const [talhaoEsc, setTalhaoEsc] = useState<string | null>(null)
  const [pontoEsc, setPontoEsc] = useState('')
  const [escolhaId, setEscolhaId] = useState<string | null>(null)
  const [nome, setNome] = useState(amostrador)
  const [salvando, setSalvando] = useState(false)

  const tid = talhaoEsc ?? talhaoId ?? talhoes?.[0]?.id ?? null
  const talhao = talhoes?.find((t) => t.id === tid)
  const plano = usePlano(tid)
  const pontoId = achado?.pontoId ?? (pontoEsc || null)
  const ponto = plano?.pontos.find((p) => p.id === pontoId)
  const escolhido = ranking.find((r) => r.candidato.id === (escolhaId ?? ranking[0]?.candidato.id)) ?? ranking[0]
  const semNome = amostrador.trim().length < 2 && nome.trim().length < 2
  const pode = !!talhao && !!ponto && !!escolhido && !semNome && !salvando

  async function salvar() {
    if (!pode || !talhao || !ponto || !escolhido) return
    setSalvando(true)
    try {
      const quem = amostrador.trim() || nome.trim()
      setAmostrador(quem)
      await anexarDiagnostico({
        talhaoId: talhao.id, pontoId: ponto.id, pendenciaId: achado?.pendenciaId ?? null, titulo: escolhido.candidato.nome,
        ...(escolhido.candidato.alvo ? { alvoId: escolhido.candidato.alvo } : {}),
        compatibilidadePct: percentual(escolhido.compat, evidencias), confianca: escolhido === ranking[0] ? confianca : 'baixa', estadio: talhao.estadio, amostrador: quem,
      })
      mostrar(`Diagnóstico salvo no ponto ${ponto.order}`)
      setDiagnosticoPara(null)
      setTalhao(talhao.id)
      setPontoFoco(ponto.id)
      onFechar()
      void navegar({ to: '/coleta' })
    } catch (e) {
      mostrar(e instanceof Error ? e.message : 'Não foi possível salvar o diagnóstico.', 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Folha aberta={aberta} onFechar={onFechar} titulo="Salvar no ponto">
      {!talhoes || talhoes.length === 0 ? (
        <p className="text-text-2">Crie um talhão em Talhões para poder salvar o diagnóstico num ponto de coleta.</p>
      ) : (
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-1 font-semibold">Qual diagnóstico salvar?</legend>
            {ranking.slice(0, 3).map((r, i) => (
              <label key={r.candidato.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
                <input type="radio" name="diag" checked={escolhido?.candidato.id === r.candidato.id} onChange={() => setEscolhaId(r.candidato.id)} className="size-5 accent-[var(--brand)]" />
                <span className="flex-1 font-semibold leading-snug">{r.candidato.nome}</span>
                {i === 0 && <span className="text-apoio text-text-2">mais compatível</span>}
              </label>
            ))}
          </fieldset>

          {achado ? (
            <p className="rounded-xl bg-info-soft p-3 text-info">Vai para o <b>ponto {ponto?.order ?? '…'}</b> de {talhao?.nome}, o achado que você guardou na Coleta.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo rotulo="Talhão"><Select value={tid ?? ''} onChange={(e) => { setTalhaoEsc(e.target.value); setPontoEsc('') }}>{talhoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select></Campo>
              <Campo rotulo="Ponto onde encontrou"><Select value={pontoEsc} onChange={(e) => setPontoEsc(e.target.value)}><option value="">Escolha o ponto</option>{plano?.pontos.map((p) => <option key={p.id} value={p.id}>Ponto {p.order}</option>)}</Select></Campo>
            </div>
          )}

          {amostrador.trim().length < 2 && <Campo rotulo="Seu nome" ajuda="Assina o registro."><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" /></Campo>}
          <Button block icon="check" disabled={!pode} onClick={() => void salvar()}>{salvando ? 'Salvando…' : ponto ? `Salvar no ponto ${ponto.order}` : 'Escolha o ponto'}</Button>
        </div>
      )}
    </Folha>
  )
}
