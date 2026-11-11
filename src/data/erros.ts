/** O armazenamento do aparelho acabou? (IndexedDB devolve QuotaExceededError, às vezes embrulhado pelo Dexie.) */
export function ehFaltaDeEspaco(e: unknown): boolean {
  const x = e as { name?: string; code?: number; inner?: { name?: string }; message?: string } | null
  if (!x || typeof x !== 'object') return false
  return x.name === 'QuotaExceededError' || x.inner?.name === 'QuotaExceededError' || x.code === 22 || /quota|storage.*full|disk.*full/i.test(x.message ?? '')
}

export const MSG_SEM_ESPACO = 'O aparelho está sem espaço para guardar. Apague fotos ou apps que você não usa e tente de novo. Nada foi perdido: o que você digitou continua na tela.'

/** Texto para a pessoa quando uma gravação falha. Falta de espaço tem mensagem própria; o resto usa `padrao`. */
export function mensagemDeGravacao(e: unknown, padrao = 'Não foi possível guardar. Tente de novo.'): string {
  return ehFaltaDeEspaco(e) ? MSG_SEM_ESPACO : padrao
}
