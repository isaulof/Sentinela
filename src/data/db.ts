import Dexie, { type EntityTable } from 'dexie'
import type { HoraClima } from '@/domain/climate'
import type { OrdemChecagem, Pendencia, PlanoSalvo, Talhao } from '@/domain/entidades'
import type { Registro } from '@/domain/registro'

export interface FotoRow {
  id: string
  blob: Blob
  criadoEm: string
  largura: number
  altura: number
}
export interface ClimaRow {
  chave: string // lat,lng arredondados
  horas: HoraClima[]
  buscadoEm: string
}
export interface ConfigRow {
  chave: string
  valor: unknown
}

export class SentinelaDB extends Dexie {
  talhoes!: EntityTable<Talhao, 'id'>
  planos!: EntityTable<PlanoSalvo, 'talhaoId'>
  registros!: EntityTable<Registro, 'id'>
  fotos!: EntityTable<FotoRow, 'id'>
  ordens!: EntityTable<OrdemChecagem, 'id'>
  pendencias!: EntityTable<Pendencia, 'id'>
  clima!: EntityTable<ClimaRow, 'chave'>
  config!: EntityTable<ConfigRow, 'chave'>

  constructor(nome = 'sentinela') {
    super(nome)
    this.version(1).stores({
      talhoes: 'id, nome',
      planos: 'talhaoId',
      registros: 'id, talhaoId, alvo, criadoEm, [talhaoId+pontoId], [talhaoId+alvo]',
      fotos: 'id',
      ordens: 'id, talhaoId, status',
      clima: 'chave',
      config: 'chave',
    })
    // v2: achados pendentes de diagnóstico (tabela nova; nada a migrar nos dados existentes).
    this.version(2).stores({ pendencias: 'id, talhaoId, [talhaoId+pontoId]' })
  }
}

export const db = new SentinelaDB()
