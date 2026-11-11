import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { percorrer, type Arvore, type Categoria } from '@/domain/diagnosis'
import { ARVORES } from '@/knowledge/arvores'
import { FONTES } from '@/knowledge/fontes'
import { REGRAS } from '@/knowledge/regras'
import { SINTOMA_SINAL } from '@/knowledge/sintomaSinal'
import { Icon } from '../components/Icon'
import { Badge, Button, Card, Segmentado, type Tom } from '../components/kit'

const CAT: Record<Categoria, { tom: Tom; texto: string }> = {
  abiotico: { tom: 'info', texto: 'Causa abiótica' },
  biotico: { tom: 'danger', texto: 'Causa biótica' },
  inconclusivo: { tom: 'warn', texto: 'Inconclusivo' },
  investigar: { tom: 'warn', texto: 'Investigar' },
}

const Origem = ({ o }: { o: Arvore['origem'] }) =>
  o === 'fonte' ? <Badge tom="ok" icon="check">Baseada em fonte Embrapa</Badge> : <Badge tom="neutral" icon="info">Raciocínio de projeto</Badge>

function Fontes({ ids }: { ids: Arvore['fontes'] }) {
  return (
    <p className="text-apoio text-text-2">
      Fontes: {ids.map((id, i) => {
        const f = FONTES[id]
        return <span key={id}>{i > 0 && ' · '}{'url' in f ? <a className="underline" href={f.url} target="_blank" rel="noreferrer">{f.rotulo}</a> : f.rotulo}</span>
      })}
    </p>
  )
}

function Arvores() {
  const [id, setId] = useState(ARVORES[0]!.id)
  const [resp, setResp] = useState<number[]>([])
  const arvore = ARVORES.find((a) => a.id === id)!
  const passo = percorrer(arvore, resp)
  const no = passo.no

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <nav aria-label="Árvores de decisão" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {ARVORES.map((a) => (
          <button key={a.id} type="button" onClick={() => { setId(a.id); setResp([]) }} aria-current={a.id === id} className={`min-h-12 shrink-0 rounded-2xl border px-4 py-2 text-left text-apoio font-semibold transition ${a.id === id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface hover:bg-surface-2'}`}>
            {a.titulo}
          </button>
        ))}
      </nav>

      <div className="space-y-4">
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-subtitulo">{arvore.titulo}</h2><Origem o={arvore.origem} /></div>
          <p className="text-text-2">{arvore.descricao}</p>
        </Card>

        {passo.trilha.length > 0 && (
          <ol className="space-y-1.5 text-apoio" aria-label="Respostas dadas">
            {passo.trilha.map((t, i) => (
              <li key={i} className="rounded-xl bg-surface-2 px-3 py-2"><span className="text-text-2">{t.pergunta}</span><br /><b>{t.resposta}</b></li>
            ))}
          </ol>
        )}

        {no.tipo === 'pergunta' ? (
          <Card className="space-y-4">
            <h3 className="text-secao">{no.texto}</h3>
            {no.dica && <p className="flex gap-2 rounded-xl bg-info-soft p-3 text-apoio text-info"><Icon name="info" size={18} className="mt-0.5 shrink-0" />{no.dica}</p>}
            <div className="grid gap-2">
              {no.opcoes.map((o, i) => (
                <button key={o.rotulo} type="button" onClick={() => setResp([...resp, i])} className="min-h-14 rounded-2xl border border-line bg-surface-2 px-4 py-3 text-left font-semibold transition hover:border-brand active:scale-[0.99]">{o.rotulo}</button>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="space-y-4" aria-live="polite">
            <Badge tom={CAT[no.categoria].tom}>{CAT[no.categoria].texto}</Badge>
            <h3 className="text-secao">{no.titulo}</h3>
            <p>{no.explicacao}</p>
            <div>
              <h4 className="mb-1.5 font-semibold">Antes de qualquer aplicação</h4>
              <ul className="space-y-1.5">
                {no.proximosPassos.map((p) => <li key={p} className="flex gap-2"><Icon name="check" size={18} className="mt-1 shrink-0 text-brand" />{p}</li>)}
              </ul>
            </div>
            <Fontes ids={arvore.fontes} />
            <p className="text-apoio text-text-2">Esta é uma hipótese de apoio ao técnico. A decisão de aplicar é sempre do agrônomo.</p>
          </Card>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setResp(resp.slice(0, -1))} disabled={resp.length === 0}>Voltar</Button>
          <Button variant="ghost" onClick={() => setResp([])} disabled={resp.length === 0}>Recomeçar</Button>
        </div>
      </div>
    </div>
  )
}

function Quadro() {
  return (
    <div className="space-y-4">
      <p className="text-text-2"><b className="text-text">Sintoma</b> é o que a planta mostra e o produtor vê. <b className="text-text">Sinal</b> é a estrutura do próprio agente (pústula, micélio, escleródio) e é o que confirma a doença.</p>
      <div className="hidden overflow-hidden rounded-card border border-line md:block">
        <table className="w-full text-left text-apoio">
          <thead className="bg-surface-2 text-text-2"><tr><th className="p-3">Doença</th><th className="p-3">Sintoma que o produtor vê</th><th className="p-3">Sinal que confirma</th><th className="p-3">Onde procurar</th></tr></thead>
          <tbody>
            {SINTOMA_SINAL.map((l) => (
              <tr key={l.doenca} className="border-t border-line align-top">
                <td className="p-3 font-semibold">{l.doenca}<br /><span className="font-normal text-text-2">{l.cultura}</span></td>
                <td className="p-3">{l.sintoma}</td>
                <td className="p-3">{l.sinal}</td>
                <td className="p-3">{l.onde}{l.aConfirmar && <p className="mt-2 text-warn">A confirmar: {l.aConfirmar}</p>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {SINTOMA_SINAL.map((l) => (
          <Card key={l.doenca} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{l.doenca}</h3><Badge tom={l.cultura === 'soja' ? 'ok' : 'neutral'}>{l.cultura}</Badge></div>
            <p><b>Sintoma: </b>{l.sintoma}</p>
            <p><b>Sinal: </b>{l.sinal}</p>
            <p><b>Onde procurar: </b>{l.onde}</p>
            {l.aConfirmar && <p className="text-apoio text-warn">A confirmar: {l.aConfirmar}</p>}
          </Card>
        ))}
      </div>
    </div>
  )
}

function Regras() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {REGRAS.map((r) => (
        <Card key={r.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{r.titulo}</h3><Origem o={r.origem} /></div>
          <p className="font-mono text-apoio leading-relaxed">
            {r.se.map((c, i) => <span key={c} className="block"><b className="text-brand">{i === 0 ? 'SE' : 'E'}</b> {c}</span>)}
            <span className="block"><b className="text-brand">ENTÃO</b> {r.entao}</span>
            {r.senao && <span className="mt-2 block text-text-2"><b>SENÃO </b>{r.senao}</span>}
          </p>
          <Fontes ids={r.fontes} />
        </Card>
      ))}
    </div>
  )
}

export function DiagnosticoTecnico() {
  const [aba, setAba] = useState<'arvores' | 'quadro' | 'regras'>('arvores')
  return (
    <>
      <header className="mb-4 flex items-center gap-1">
        <Link to="/diagnostico" aria-label="Voltar para Diagnóstico" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></Link>
        <div className="min-w-0">
          <h1 className="text-secao">Material do técnico</h1>
          <p className="text-apoio text-text-2">Árvores de decisão, sintoma × sinal e regras SE … ENTÃO, para o agrônomo e para a banca.</p>
        </div>
      </header>
      <div className="mb-4">
        <Segmentado rotulo="Seção" valor={aba} onChange={setAba} opcoes={[{ id: 'arvores', nome: 'Árvores de decisão' }, { id: 'quadro', nome: 'Sintoma × sinal' }, { id: 'regras', nome: 'Regras SE … ENTÃO' }]} />
      </div>
      {aba === 'arvores' && <Arvores />}
      {aba === 'quadro' && <Quadro />}
      {aba === 'regras' && <Regras />}
    </>
  )
}
