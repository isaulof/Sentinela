import { useEffect, useRef } from 'react'
import type { Candidato } from '@/domain/funil'
import { FOTO_CLASSE, fotosDoCandidato } from './fotosDiagnostico'
import { FotoRef } from './FotoRef'
import { Icon } from './Icon'
import { Button } from './kit'

interface Props {
  candidatos: Candidato[]
  rodada: number
  contexto?: React.ReactNode
  onEscolher: (candidatoId: string) => void
  onNenhuma: () => void
  onNaoSei: () => void
  onVoltar: () => void
}

/** Etapa 3: o usuário compara fotos e toca na que mais se parece com o que vê na lavoura. */
export function CompararFotos({ candidatos, rodada, contexto, onEscolher, onNenhuma, onNaoSei, onVoltar }: Props) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    titulo.current?.focus({ preventScroll: true })
  }, [rodada])

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-4 flex items-center gap-1">
        <button type="button" onClick={onVoltar} aria-label="Voltar para a pergunta anterior" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-apoio">
            <span className="font-semibold">Comparar fotos{rodada > 1 ? ' · outras opções' : ''}</span>
            <span className="text-text-2">Quase lá</span>
          </div>
          <div role="progressbar" aria-label="Andamento do diagnóstico" aria-valuenow={90} aria-valuemin={0} aria-valuemax={100} aria-valuetext="Comparar fotos, quase lá" className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-[90%] rounded-full bg-brand" />
          </div>
        </div>
      </header>
      {contexto && <div className="mb-4">{contexto}</div>}

      <h2 ref={titulo} tabIndex={-1} className="text-titulo leading-tight outline-none">Qual foto mais se parece com o que você vê?</h2>
      <p className="mt-2.5 flex gap-2.5 rounded-xl bg-info-soft px-3 py-2.5 text-apoio leading-snug text-info"><Icon name="info" size={20} className="mt-0.5 shrink-0" /><span>Compare com a planta na sua mão. Leia o que olhar embaixo de cada foto. Se nenhuma parece, tudo bem.</span></p>

      <ul className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {candidatos.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onEscolher(c.id)} className="flex h-full w-full flex-col overflow-hidden rounded-card bg-surface text-left ring-1 ring-line transition active:scale-[0.98] active:bg-brand-soft">
              <FotoRef
                arquivo={fotosDoCandidato(c)} alt={`Foto de referência: ${c.nome}`} className={FOTO_CLASSE}
                fallback={<span className="grid aspect-[4/3] w-full place-items-center bg-surface-2 text-text-2"><span className="flex flex-col items-center gap-1 px-3 text-center text-apoio"><Icon name="camera" size={26} />Foto ainda não adicionada</span></span>}
              />
              <span className="block space-y-1 p-3">
                <span className="block text-corpo font-semibold leading-snug">{c.nome}</span>
                <span className="block text-apoio leading-snug text-text-2"><span className="font-semibold text-text">O que olhar: </span>{c.sinalChave ?? c.comoConfirmar[0]}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-col items-stretch gap-1">
        <Button variant="secondary" onClick={onNenhuma}>Nenhuma parece</Button>
        <Button variant="ghost" onClick={onNaoSei}>Não consigo comparar</Button>
      </div>
    </div>
  )
}
