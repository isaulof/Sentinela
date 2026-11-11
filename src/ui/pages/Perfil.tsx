import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { db } from '@/data/db'
import { useOrdens, useTalhoes, useTodosRegistros } from '@/data/hooks'
import { carregarDemonstracao } from '@/data/seed'
import { calcularKpis } from '@/domain/hibrido'
import { FONTES } from '@/knowledge/fontes'
import { Badge, Button, Campo, Card, Folha, Input, Segmentado, Stat, Titulo } from '../components/kit'
import { FormFazenda } from '../components/FormFazenda'
import { useTema } from '../hooks/useTema'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'

export function Perfil() {
  const { amostrador, setAmostrador, gpsReal, setGpsReal } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const talhoes = useTalhoes()
  const registros = useTodosRegistros()
  const ordens = useOrdens()
  const { tema, definir } = useTema()
  const [apagar, setApagar] = useState(false)
  const temDados = (talhoes?.length ?? 0) > 0
  const kpis = useMemo(() => calcularKpis(ordens ?? [], registros ?? []), [ordens, registros])

  async function apagarTudo() {
    await Promise.all(db.tables.map((t) => t.clear()))
    useSessao.getState().setTalhao(null)
    setApagar(false)
    mostrar('Todos os dados foram apagados deste aparelho.')
  }

  return (
    <>
      <Titulo sub="Seu nome, preferências e informações do app.">Perfil</Titulo>
      <div className="grid gap-5 lg:grid-cols-2">
        <FormFazenda />
        <Card className="space-y-4">
          <h2 className="text-subtitulo">Preferências</h2>
          <Campo rotulo="Seu nome" ajuda="Assina os registros que você faz."><Input value={amostrador} onChange={(e) => setAmostrador(e.target.value)} placeholder="Nome e sobrenome" /></Campo>
          <Campo grupo rotulo="Aparência">
            <Segmentado rotulo="Aparência" valor={tema} onChange={definir} opcoes={[{ id: 'auto', nome: 'Automática' }, { id: 'claro', nome: 'Clara' }, { id: 'escuro', nome: 'Escura' }]} />
          </Campo>
          <div className="flex items-start justify-between gap-4 rounded-xl bg-surface-2 p-4">
            <div>
              <p className="font-semibold">Usar GPS real</p>
              <p className="text-apoio text-text-2">{gpsReal ? 'O registro usa a sua posição e avisa se você estiver longe do talhão.' : 'Demonstração: o registro usa a posição planejada do ponto, como se você estivesse lá. O guia até o ponto sempre usa o GPS real.'}</p>
            </div>
            <button type="button" role="switch" aria-checked={gpsReal} aria-label="Usar GPS real" onClick={() => setGpsReal(!gpsReal)} className={`relative h-8 w-14 shrink-0 rounded-full transition ${gpsReal ? 'bg-brand' : 'bg-line'}`}>
              <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${gpsReal ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-subtitulo">Demonstração</h2>
          <p className="text-apoio text-text-2">Carrega a Fazenda Santa Aurora (fictícia), com talhões, coletas, fotos de exemplo e pontos para checar. Ideal para apresentar em sala, sem ir a campo.</p>
          <Button block onClick={() => { void carregarDemonstracao().then(() => mostrar('Demonstração carregada')) }}>Carregar demonstração</Button>
          <Button block variant="danger" onClick={() => setApagar(true)} disabled={!temDados && !(ordens?.length)}>Apagar todos os dados</Button>
        </Card>
      </div>

      <details className="mt-6 rounded-card border border-line bg-surface p-4">
        <summary className="cursor-pointer text-subtitulo font-semibold">Indicadores do projeto</summary>
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores">
          <Stat rotulo="Ordens de checagem" valor={kpis.ordensAbertas} tom={kpis.ordensAbertas ? 'warn' : 'ok'} detalhe={`${kpis.ordensResolvidas} resolvidas`} />
          <Stat rotulo="Aplicações evitadas" valor={kpis.aplicacoesEvitadas} tom="ok" detalhe="falsos positivos resolvidos em campo" />
          <Stat rotulo="Registros com foto" valor={kpis.pontosComFotoPct === null ? '–' : `${kpis.pontosComFotoPct}%`} detalhe={`${kpis.zerosRegistrados} zeros registrados`} />
          <Stat rotulo="Registros" valor={registros?.length ?? 0} detalhe={`${talhoes?.length ?? 0} talhões`} />
        </section>
        {kpis.tempoMedioH !== null && <p className="mt-3 text-apoio text-text-2">Tempo médio do alerta à confirmação: <b className="text-text">{kpis.tempoMedioH.toFixed(1)} h</b>{kpis.dentroDoSla !== null && <> · {kpis.dentroDoSla}% dentro do prazo de 24 h</>}.</p>}
      </details>

      <details className="mt-4 rounded-card border border-line bg-surface p-4">
        <summary className="cursor-pointer text-subtitulo font-semibold">Sobre o Sentinela e fontes</summary>
        <div className="mt-3 space-y-3">
          <p className="text-apoio text-text-2">Aplicativo do Projeto Técnico de Monitoramento Fitossanitário 5.0 (UNEMAT, Tecnólogo em Agrocomputação). Funciona offline e guarda tudo no seu aparelho.</p>
          <p className="text-apoio text-text-2">O app apoia a decisão, não a substitui: nenhuma tela recomenda aplicar um defensivo. A decisão é sempre do agrônomo.</p>
          <div className="flex flex-wrap items-center gap-2"><Badge tom="neutral">Versão 0.4</Badge><Link to="/estilo" className="text-apoio underline">Guia de estilo</Link></div>
          <h3 className="pt-2 text-corpo font-semibold">Referências</h3>
          <ul className="space-y-3 text-apoio">
            {Object.values(FONTES).filter((f) => f.tipo === 'confirmada').map((f) => (
              <li key={f.id}>{f.citacao}{'url' in f && f.url && <> <a href={f.url} target="_blank" rel="noreferrer" className="break-all text-info underline">Acessar</a></>}</li>
            ))}
          </ul>
          <p className="text-rotulo text-text-2">Parâmetros marcados como "decisão de projeto" (bordadura, número de pontos por área, perfis de sintomas do diagnóstico, índices de risco climático) não são normas da Embrapa e estão identificados nas telas.</p>
        </div>
      </details>

      <Folha aberta={apagar} onFechar={() => setApagar(false)} titulo="Apagar todos os dados?">
        <div className="space-y-4">
          <p>Isso remove talhões, planos, registros, achados e fotos <b>deste aparelho</b>. Não dá para desfazer.</p>
          <div className="flex gap-3"><Button variant="secondary" onClick={() => setApagar(false)}>Cancelar</Button><Button variant="danger" onClick={() => void apagarTudo()}>Apagar tudo</Button></div>
        </div>
      </Folha>
    </>
  )
}
