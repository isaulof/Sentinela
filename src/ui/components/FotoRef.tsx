import { useState } from 'react'

/**
 * Foto de referência em public/imagens/diagnostico/. Aceita um nome ou uma lista (tenta na ordem).
 * Se nenhum arquivo existe ainda, mostra o `fallback` (ou nada).
 */
export function FotoRef({ arquivo, alt, className, fallback }: { arquivo: string | readonly string[]; alt: string; className?: string; fallback?: React.ReactNode }) {
  const lista = typeof arquivo === 'string' ? [arquivo] : arquivo
  const [i, setI] = useState(0)
  const atual = lista[i]
  if (!atual) return <>{fallback ?? null}</>
  return <img key={atual} src={`./imagens/diagnostico/${atual}`} alt={alt} loading="lazy" onError={() => setI((n) => n + 1)} className={className} />
}
