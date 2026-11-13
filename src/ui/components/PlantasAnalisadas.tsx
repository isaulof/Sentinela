import { useId } from 'react'
import { MAX_PLANTAS_ANALISADAS } from '@/domain/validation'
import { Input } from './kit'

/** Quantas plantas foram olhadas neste ponto. Uma vez por ponto: vale para todos os alvos que forem registrados nele. */
export function PlantasAnalisadas({ valor, onChange }: { valor: number | null | undefined; onChange: (n: number | null) => void }) {
  const id = useId()
  const ajuda = `${id}-ajuda`
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
      <label htmlFor={id} className="min-w-0 text-apoio font-semibold leading-tight">
        Plantas analisadas
        <span id={ajuda} className="block text-rotulo font-normal text-text-2">{valor ? 'Vale para todos os alvos deste ponto' : 'Informe para registrar'}</span>
      </label>
      <Input
        id={id} type="number" inputMode="numeric" min={1} max={MAX_PLANTAS_ANALISADAS} aria-describedby={ajuda} placeholder="0" className="!w-24 shrink-0 text-center"
        value={valor ?? ''}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value))
          onChange(e.target.value === '' || !Number.isFinite(n) || n < 1 ? null : Math.min(MAX_PLANTAS_ANALISADAS, n))
        }}
      />
    </div>
  )
}
