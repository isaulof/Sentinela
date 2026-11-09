import { Link, type ErrorComponentProps } from '@tanstack/react-router'
import { Button, Vazio } from '../components/kit'

export function Carregando() {
  return <p role="status" className="py-16 text-center text-text-2">Carregando…</p>
}

export function NaoEncontrada() {
  return (
    <Vazio icone="mapa" titulo="Página não encontrada" texto="O endereço não existe neste app." acao={<Link to="/"><Button>Ir para o Painel</Button></Link>} />
  )
}

export function Erro({ error, reset }: ErrorComponentProps) {
  return (
    <div role="alert">
      <Vazio
        icone="alerta"
        titulo="Algo deu errado nesta tela"
        texto="Seus dados continuam salvos no aparelho. Tente de novo; se persistir, volte ao Painel."
        acao={<div className="flex flex-wrap justify-center gap-3"><Button onClick={reset}>Tentar de novo</Button><Link to="/"><Button variant="secondary">Painel</Button></Link></div>}
      />
      <details className="mx-auto mt-4 max-w-xl text-sm text-text-2"><summary className="cursor-pointer">Detalhes técnicos</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{error instanceof Error ? error.message : String(error)}</pre></details>
    </div>
  )
}
