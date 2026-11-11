import type { PlanoSalvo, Talhao } from '@/domain/entidades'
import { guiarAte } from '@/domain/navegacao'
import type { EstadoGps } from '../hooks/useGps'
import { FaixaGuia } from './FaixaGuia'
import { Icon } from './Icon'
import { Mapa } from './Mapa'
import type { MarcadorPonto } from './estadoPonto'

interface Props {
  talhao: Talhao
  plano: PlanoSalvo
  marcadores: MarcadorPonto[]
  ponto: PlanoSalvo['pontos'][number]
  proximo: string | null
  gps: EstadoGps
  onPonto: (id: string) => void
  onAnterior: () => void
  onProximo: () => void
  onParar: () => void
  onRegistrar: () => void
}

/**
 * Navegação até o ponto em tela cheia: some o cabeçalho, o seletor, a barra de progresso e a legenda.
 * O mapa ocupa tudo; em cima, a faixa do guia; embaixo, uma única ação ("Cheguei · Registrar") entre os botões de ponto.
 * Os três botões de registro ficam numa gaveta, aberta por essa ação.
 */
export function ModoNavegacao({ talhao, plano, marcadores, ponto, proximo, gps, onPonto, onAnterior, onProximo, onParar, onRegistrar }: Props) {
  const fix = gps.estado === 'ok' ? gps.fix : null
  const chegou = fix ? guiarAte(fix.posicao, fix.precisaoM, ponto.position, fix.rumo).chegou : false
  const linha = fix ? { de: fix.posicao, ate: ponto.position } : null
  const total = plano.pontos.length

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg" role="region" aria-label={`Guia até o ponto ${ponto.order}`}>
      <div className="relative min-h-0 flex-1">
        <Mapa
          className="h-full w-full"
          talhoes={[talhao]} selecionadoId={talhao.id} onSelecionar={() => {}}
          marcadores={marcadores} pontoSelecionado={ponto.id} pontoProximo={proximo} onPonto={onPonto}
          caminho={plano.caminho} enquadrar={talhao.anel}
          eu={fix ? { posicao: fix.posicao, precisaoM: fix.precisaoM, rumo: fix.rumo } : null}
          guia={linha} seguir recuoControles
        />
        <FaixaGuia gps={gps} alvo={{ id: ponto.id, ordem: ponto.order, posicao: ponto.position }} onParar={onParar} />
      </div>

      <div className="safe-b flex items-center gap-2.5 border-t border-line bg-surface px-3 pt-2.5 pb-2.5">
        <button type="button" aria-label="Ponto anterior" onClick={onAnterior} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line hover:bg-surface-2"><Icon name="seta" className="rotate-180" /></button>
        <button
          type="button" onClick={onRegistrar}
          className={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition active:scale-[0.98] ${chegou ? 'bg-brand text-on-brand' : 'bg-brand-soft text-brand'}`}
        >
          <Icon name="check" size={20} /><span className="truncate">Cheguei · Registrar</span>
        </button>
        <button type="button" aria-label="Próximo ponto" onClick={onProximo} className="grid size-12 shrink-0 place-items-center rounded-xl border border-line hover:bg-surface-2"><Icon name="seta" /></button>
      </div>
      <p className="sr-only">Ponto {ponto.order} de {total}</p>
    </div>
  )
}
