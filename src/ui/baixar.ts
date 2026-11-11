/** Entrega um arquivo de texto ao usuário (download). Funciona offline: o conteúdo já está no aparelho. */
export function baixarTexto(nome: string, conteudo: string, tipo: string): void {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
