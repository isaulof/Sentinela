import { describe, expect, it } from 'vitest'
import { mensagemParaAgronomo, type DadosRelatorio } from './relatorio'

const base: DadosRelatorio = {
  fazenda: 'Fazenda Santa Aurora', talhao: 'T-01 Mirante', ponto: 3, estadio: 'R3',
  principal: { nome: 'Ferrugem-asiática', cientifico: 'Phakopsora pachyrhizi', confianca: 'alta' },
  outras: ['Doenças de final de ciclo', 'Mancha-alvo'],
  respostas: [{ pergunta: 'Onde está o problema?', resposta: 'Manchas ou pontos nas folhas' }, { pergunta: 'Como são as marcas?', resposta: 'Pontinhos ou pústulas por baixo' }],
  passos: ['Tire fotos.', 'Avise o agrônomo hoje.'],
  quando: new Date(2026, 10, 9),
}

describe('mensagem para o agrônomo', () => {
  const m = mensagemParaAgronomo(base)
  it('traz local, hipótese, confiança em palavras e a data', () => {
    expect(m).toContain('09/11/2026')
    expect(m).toContain('Local: T-01 Mirante · ponto 3 · fase R3')
    expect(m).toContain('Hipótese mais compatível: Ferrugem-asiática (Phakopsora pachyrhizi) · bem provável')
    expect(m).toContain('Também possível: Doenças de final de ciclo; Mancha-alvo')
  })
  it('lista o que foi observado e os próximos passos', () => {
    expect(m).toContain('- Onde está o problema? Manchas ou pontos nas folhas')
    expect(m).toContain('2. Avise o agrônomo hoje.')
  })
  it('deixa claro que é pista e não recomenda produto nem dose', () => {
    expect(m).toMatch(/não um laudo/)
    expect(m).not.toMatch(/aplique|dose|\bmL\b|litro/i)
  })
  it('funciona sem talhão, ponto, fazenda ou alternativas', () => {
    const s = mensagemParaAgronomo({ ...base, fazenda: undefined, talhao: undefined, ponto: undefined, estadio: undefined, outras: [], passos: [] })
    expect(s).not.toContain('Local:')
    expect(s).not.toContain('Também possível')
    expect(s).not.toContain('Próximos passos')
  })
})
