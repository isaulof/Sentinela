import { describe, expect, it } from 'vitest'
import { chaveRascunho, rascunhoTemConteudo, rascunhoValido, type RascunhoRegistro } from './rascunho'

const vazio: Omit<RascunhoRegistro, 'salvoEm'> = { alvoId: 'percevejo', fase: '', quantidade: 0, zero: false, obs: '', repeticoes: 1, condicoes: {}, estadio: 'R3', fotos: [] }
const agora = new Date('2026-11-11T17:00:00Z')

describe('rascunho do registro', () => {
  it('formulário aberto e parado não gera rascunho', () => expect(rascunhoTemConteudo(vazio)).toBe(false))
  it('qualquer preenchimento gera', () => {
    for (const mudanca of [{ fase: 'Adulto' }, { quantidade: 2 }, { zero: true }, { presente: false }, { severidade: 3 }, { desfolha: 5 }, { obs: ' manchas ' }, { fotos: ['f'] }, { repeticoes: 5 }, { condicoes: { tempo: 'nublado' as const } }, { alvoId: 'ferrugem' as const }, { metodoUsado: 'Rede de varredura' }])
      expect(rascunhoTemConteudo({ ...vazio, ...mudanca }), JSON.stringify(mudanca)).toBe(true)
    expect(rascunhoTemConteudo({ ...vazio, obs: '   ' })).toBe(false)
  })
  it('uma chave por talhão e ponto', () => {
    expect(chaveRascunho('T-01', 'P03')).toBe('rascunho:registro:T-01:P03')
    expect(chaveRascunho('T-01', 'P03')).not.toBe(chaveRascunho('T-02', 'P03'))
  })
  it('vale por 24 h; velho, do futuro ou corrompido é descartado', () => {
    const r = (salvoEm: string) => ({ ...vazio, salvoEm })
    expect(rascunhoValido(r('2026-11-11T16:00:00Z'), agora)).toBe(true)
    expect(rascunhoValido(r('2026-11-10T16:59:00Z'), agora)).toBe(false) // 24 h e 1 min
    expect(rascunhoValido(r('2026-11-12T17:00:00Z'), agora)).toBe(false) // futuro (relógio mudou)
    expect(rascunhoValido(r('lixo'), agora)).toBe(false)
    expect(rascunhoValido(null, agora)).toBe(false)
    expect(rascunhoValido({ foo: 1 }, agora)).toBe(false)
    expect(rascunhoValido('texto', agora)).toBe(false)
  })
})
