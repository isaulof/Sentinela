import type { LucideProps } from 'lucide-react'
import { ICONES_MAPA } from './iconMapa'

export type IconName = keyof typeof ICONES_MAPA

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & Omit<LucideProps, 'size' | 'name'>) {
  const C = ICONES_MAPA[name]
  return <C size={size} strokeWidth={2} aria-hidden="true" {...rest} />
}
