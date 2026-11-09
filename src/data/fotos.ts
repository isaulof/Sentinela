import { useEffect, useState } from 'react'
import { db } from './db'
import { novoId } from './repo'

const LADO_MAX = 1280
const QUALIDADE = 0.72

/** Reduz a foto (câmera ou galeria) para caber no armazenamento do celular. */
export async function comprimirImagem(arquivo: Blob): Promise<{ blob: Blob; largura: number; altura: number }> {
  const bmp = await createImageBitmap(arquivo)
  const k = Math.min(1, LADO_MAX / Math.max(bmp.width, bmp.height))
  const largura = Math.round(bmp.width * k)
  const altura = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, largura, altura)
  bmp.close()
  const blob = await new Promise<Blob>((ok, err) => canvas.toBlob((b) => (b ? ok(b) : err(new Error('Falha ao comprimir a foto'))), 'image/jpeg', QUALIDADE))
  return { blob, largura, altura }
}

export async function salvarFoto(arquivo: Blob): Promise<string> {
  const { blob, largura, altura } = await comprimirImagem(arquivo)
  const id = novoId('foto')
  await db.fotos.put({ id, blob, largura, altura, criadoEm: new Date().toISOString() })
  return id
}

export async function salvarFotoBruta(blob: Blob, largura: number, altura: number): Promise<string> {
  const id = novoId('foto')
  await db.fotos.put({ id, blob, largura, altura, criadoEm: new Date().toISOString() })
  return id
}

/** URL temporária da foto, liberada ao desmontar. */
export function useFotoUrl(id: string | undefined): string | undefined {
  const [par, setPar] = useState<{ id: string; url: string }>()
  useEffect(() => {
    if (!id) return
    let u: string | undefined
    let vivo = true
    void db.fotos.get(id).then((f) => {
      if (f && vivo) { u = URL.createObjectURL(f.blob); setPar({ id, url: u }) }
    })
    return () => { vivo = false; if (u) URL.revokeObjectURL(u) }
  }, [id])
  return par && par.id === id ? par.url : undefined
}
