import Dexie, { type EntityTable } from 'dexie'
import type { HoraClima } from '@/domain/climate'
import type { Fazenda, OrdemChecagem, Pendencia, PlanoSalvo, Talhao } from '@/domain/entidades'
import { migrarRegistro, type Registro } from '@/domain/registro'

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
  fazendas!: EntityTable<Fazenda, 'id'>

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
    // v3: entidade Fazenda e Registro v2. Os registros antigos só ganham a marca de versão (schema 1);
    // método, fuso e demais campos novos ficam ausentes, nunca inventados.
    this.version(3)
      .stores({ fazendas: 'id' })
      .upgrade((tx) => tx.table('registros').toCollection().modify((r: Registro) => { Object.assign(r, migrarRegistro(r)) }))
  }
}

export const db = new SentinelaDB()
