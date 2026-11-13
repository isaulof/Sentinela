/**
 * Como a coleta foi feita. A pergunta no registro é OPCIONAL: em branco vale o método do protocolo do alvo
 * (`Alvo.coleta.metodo`). Estas opções só ajudam a registrar quando a pessoa usou outro caminho.
 */
export interface MetodoDeColeta { id: string; nome: string; para: readonly ('praga' | 'doenca')[] }

export const METODOS_DE_COLETA: readonly MetodoDeColeta[] = [
  { id: 'pano', nome: 'Pano de batida', para: ['praga'] },
  { id: 'visual', nome: 'Inspeção visual das plantas', para: ['praga', 'doenca'] },
  { id: 'lupa', nome: 'Inspeção de folhas com lupa', para: ['praga', 'doenca'] },
  { id: 'rede', nome: 'Rede de varredura', para: ['praga'] },
  { id: 'armadilha', nome: 'Armadilha adesiva amarela', para: ['praga'] },
  { id: 'contagem', nome: 'Contagem de plantas na fileira', para: ['praga', 'doenca'] },
  { id: 'solo', nome: 'Escavação do solo (trincheira)', para: ['praga'] },
  { id: 'arranque', nome: 'Arranque de plantas e corte da haste', para: ['doenca'] },
  { id: 'outro', nome: 'Outro método (descreva na observação)', para: ['praga', 'doenca'] },
]

export const metodosPara = (tipo: 'praga' | 'doenca'): MetodoDeColeta[] => METODOS_DE_COLETA.filter((m) => m.para.includes(tipo))
