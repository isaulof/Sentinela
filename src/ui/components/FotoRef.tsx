import { useState } from 'react'

/** Foto de referência em public/imagens/diagnostico/. Se o arquivo ainda não existe, não mostra nada (ou o fallback). */
export function FotoRef({ arquivo, alt, className, fallback }: { arquivo: string; alt: string; className?: string; fallback?: React.ReactNode }) {
  const [falhou, setFalhou] = useState(false)
  if (falhou) return <>{fallback ?? null}</>
  return <img src={`./imagens/diagnostico/${arquivo}`} alt={alt} loading="lazy" onError={() => setFalhou(true)} className={className} />
}
