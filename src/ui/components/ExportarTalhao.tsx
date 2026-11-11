import { Link } from '@tanstack/react-router'
import { useRegistrosComHistorico } from '@/data/hooks'
import { nomeDoArquivo, registrosParaCsv, registrosParaGeoJson } from '@/domain/exportar'
import type { PlanoSalvo, Talhao } from '@/domain/entidades'
import { baixarTexto } from '../baixar'
import { useToast } from '../state/toast'
import { Icon } from './Icon'
import { Button, Card } from './kit'

/** Exporta os registros do talhão para avaliação: CSV e GeoJSON com todos os campos e o relatório para imprimir ou salvar em PDF. */
export function ExportarTalhao({ talhao, plano, fuso }: { talhao: Talhao; plano: PlanoSalvo; fuso?: string }) {
  const todos = useRegistrosComHistorico(talhao.id)
  const mostrar = useToast((s) => s.mostrar)
  if (todos === undefined) return null // sem botões desativados piscando enquanto carrega
  const vazio = todos.length === 0
  const baixar = (tipo: 'csv' | 'geojson') => {
    const agora = new Date()
    if (tipo === 'csv') baixarTexto(nomeDoArquivo(talhao, agora, 'csv', fuso), registrosParaCsv(todos, talhao, plano), 'text/csv')
    else baixarTexto(nomeDoArquivo(talhao, agora, 'geojson', fuso), JSON.stringify(registrosParaGeoJson(todos, talhao, plano, agora), null, 2), 'application/geo+json')
    mostrar(`${tipo === 'csv' ? 'CSV' : 'GeoJSON'} gerado com ${todos.length} registro(s), incluindo versões e desfeitos.`)
  }
  return (
    <Card className="space-y-3">
      <h2 className="text-subtitulo">Exportar para avaliação</h2>
      <p className="text-apoio text-text-2">Os arquivos trazem todos os campos de cada registro, inclusive correções e registros desfeitos, com o estado de cada um.</p>
      <div className="grid gap-2.5 sm:grid-cols-3">
        <Link to="/talhoes/$id/relatorio" params={{ id: talhao.id }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-on-brand transition active:scale-[0.97]"><Icon name="livro" size={20} />Relatório (PDF)</Link>
        <Button variant="secondary" disabled={vazio} onClick={() => baixar('csv')}>Baixar CSV</Button>
        <Button variant="secondary" disabled={vazio} onClick={() => baixar('geojson')}>Baixar GeoJSON</Button>
      </div>
      {vazio && <p className="text-apoio text-text-2">Ainda não há registros neste talhão para exportar.</p>}
    </Card>
  )
}
