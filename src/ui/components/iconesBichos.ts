import { createLucideIcon } from 'lucide-react'

/**
 * Ícones de insetos e anatomia no mesmo traço do conjunto Lucide (grade 24, traço 2, pontas redondas),
 * porque o conjunto não tem lagarta, larva, percevejo, mosquinha nem ácaro. Cada um mostra o bicho de cima.
 */
type No = Parameters<typeof createLucideIcon>[1]
const forma = (nos: [string, Record<string, string | number>][]): No => nos.map(([tag, attrs], i) => [tag, { ...attrs, key: `${tag}${i}` }]) as unknown as No

/** Lagarta: corpo em gomos, cabeça com antenas e patinhas carnudas. */
export const Lagarta = createLucideIcon('lagarta', forma([
  ['circle', { cx: 4.5, cy: 16.5, r: 2 }], ['circle', { cx: 8.7, cy: 14.5, r: 2.2 }], ['circle', { cx: 13, cy: 14, r: 2.2 }], ['circle', { cx: 17, cy: 14.5, r: 2.1 }],
  ['circle', { cx: 20, cy: 10.5, r: 1.8 }], ['path', { d: 'M19 8.7 18 6.8' }], ['path', { d: 'M21.2 8.8 22 7' }],
  ['path', { d: 'M4.5 18.5v1.7' }], ['path', { d: 'M8.7 16.7v1.9' }], ['path', { d: 'M13 16.2v1.9' }], ['path', { d: 'M17 16.6v1.7' }],
]))

/** Larva: corpo grosso e curvado em C, sem patas visíveis, cabeça arredondada. */
export const Larva = createLucideIcon('larva', forma([
  ['path', { d: 'M15.5 5.5a7.5 7.5 0 1 0 4.2 9.3' }], ['circle', { cx: 18.6, cy: 17.3, r: 1.9 }],
  ['path', { d: 'M10.2 4.6v2.4' }], ['path', { d: 'M6.3 7.6l1.6 1.6' }], ['path', { d: 'M4.6 12.2h2.3' }], ['path', { d: 'M6.3 16.9l1.6-1.6' }],
]))

/** Besouro: casca dura com linha no meio, cabeça, antenas e seis patas. */
export const Besouro = createLucideIcon('besouro', forma([
  ['ellipse', { cx: 12, cy: 14, rx: 4.6, ry: 6 }], ['path', { d: 'M12 8.2v11.6' }],
  ['path', { d: 'M10.4 8.4a1.7 1.7 0 0 1 3.2 0' }], ['path', { d: 'M10.6 6.2 9 3.6' }], ['path', { d: 'M13.4 6.2 15 3.6' }],
  ['path', { d: 'M7.5 11.5 4.5 10.5' }], ['path', { d: 'M7.4 14.5H4' }], ['path', { d: 'M8 18l-2.8 1.8' }],
  ['path', { d: 'M16.5 11.5l3-1' }], ['path', { d: 'M16.6 14.5H20' }], ['path', { d: 'M16 18l2.8 1.8' }],
]))

/** Percevejo: corpo achatado em escudo, cabeça pequena, antenas e patas laterais. */
export const Percevejo = createLucideIcon('percevejo', forma([
  ['path', { d: 'M12 7 17.6 9.4 16.6 17 12 20.6 7.4 17 6.4 9.4Z' }], ['path', { d: 'M8.8 12h6.4' }], ['path', { d: 'M12 12v8.6' }],
  ['path', { d: 'M10.6 7.2 9.2 3.6' }], ['path', { d: 'M13.4 7.2 14.8 3.6' }],
  ['path', { d: 'M6.8 11 3.6 9.8' }], ['path', { d: 'M6.7 14.4 3.6 15.6' }], ['path', { d: 'M17.2 11l3.2-1.2' }], ['path', { d: 'M17.3 14.4l3.1 1.2' }],
]))

/** Mosquinha ou pulgão: corpo pequeno e duas asas abertas. */
export const Mosquinha = createLucideIcon('mosquinha', forma([
  ['path', { d: 'M10.3 12.6C6 12.4 3.4 8.8 5.8 7.2c2.5-1.6 4.8 1.6 4.5 5.4Z' }], ['path', { d: 'M13.7 12.6c4.3-.2 6.9-3.8 4.5-5.4-2.5-1.6-4.8 1.6-4.5 5.4Z' }],
  ['path', { d: 'M12 11.2c-1.6 2.4-1.5 6.2 0 8.6 1.5-2.4 1.6-6.2 0-8.6Z' }], ['circle', { cx: 12, cy: 9.7, r: 1.4 }],
]))

/** Ácaro: corpo redondo e oito patas (quatro de cada lado). */
export const Acaro = createLucideIcon('acaro', forma([
  ['circle', { cx: 12, cy: 12, r: 3.6 }],
  ['path', { d: 'M8.6 10 4.8 7.6' }], ['path', { d: 'M8.4 11.8 4 11.4' }], ['path', { d: 'M8.4 13.2 4 14' }], ['path', { d: 'M8.7 14.9 5.2 17.6' }],
  ['path', { d: 'M15.4 10l3.8-2.4' }], ['path', { d: 'M15.6 11.8l4.4-.4' }], ['path', { d: 'M15.6 13.2l4.4.8' }], ['path', { d: 'M15.3 14.9l3.5 2.7' }],
]))
