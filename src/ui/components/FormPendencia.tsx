import { useState } from 'react'
import { mensagemDeGravacao } from '@/data/erros'
import { salvarFoto } from '@/data/fotos'
import { novoId, repo } from '@/data/repo'
import type { Talhao } from '@/domain/entidades'
import { useSessao } from '../state/store'
import { useToast } from '../state/toast'
import { Icon } from './Icon'
import { Miniatura } from './FormRegistro'
import { Button, Campo, Input } from './kit'

interface Props {
  talhao: Talhao
  pontoId: string
  ordem: number
  onSalvo: () => void
}

/** Guarda um achado que o amostrador não soube identificar, para diagnosticar depois ("diagnóstico probabilístico"). */
export function FormPendencia({ talhao, pontoId, ordem, onSalvo }: Props) {
  const { amostrador, setAmostrador } = useSessao()
  const mostrar = useToast((s) => s.mostrar)
  const [nome, setNome] = useState(amostrador)
  const [fotos, setFotos] = useState<string[]>([])
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const semNome = nome.trim().length < 2
  const pode = !semNome && !salvando

  async function anexar(arquivos: FileList | null) {
    if (!arquivos) return
    try {
      const ids = await Promise.all([...arquivos].map((f) => salvarFoto(f)))
      setFotos((x) => [...x, ...ids])
    } catch (e) {
      mostrar(mensagemDeGravacao(e, 'Não foi possível ler a foto. Tente outra imagem.'), 'erro')
    }
  }

  async function salvar() {
    if (!pode) return
    setSalvando(true)
    try {
      setAmostrador(nome.trim())
      await repo.salvarPendencia({ id: novoId('PEN'), talhaoId: talhao.id, pontoId, fotoIds: fotos, nota: nota.trim(), estadio: talhao.estadio, amostrador: nome.trim(), criadoEm: new Date().toISOString() })
      mostrar(`Ponto ${ordem} guardado para diagnóstico`)
      onSalvo()
    } catch (e) {
      mostrar(mensagemDeGravacao(e, 'Não foi possível guardar o achado. Tente de novo.'), 'erro')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-text-2">Tire fotos do que você viu. Depois, em <b>Diagnóstico</b>, o app ajuda a descobrir o que é e liga o resultado a este ponto.</p>
      {!amostrador && <Campo rotulo="Seu nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome e sobrenome" /></Campo>}
      <Campo grupo rotulo="Fotos" ajuda="Folha, inseto ou planta inteira. Mais de uma ajuda.">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 font-semibold"><Icon name="camera" size={20} />Câmera<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void anexar(e.target.files); e.target.value = '' }} /></label>
          <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 font-semibold"><Icon name="mais1" size={20} />Galeria<input type="file" accept="image/*" multiple hidden onChange={(e) => { void anexar(e.target.files); e.target.value = '' }} /></label>
          {fotos.map((id) => <Miniatura key={id} id={id} onRemover={() => setFotos((x) => x.filter((y) => y !== id))} />)}
        </div>
      </Campo>
      <Campo rotulo="O que você viu? (opcional)">
        <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder="Ex.: manchas marrons nas folhas de baixo" className="w-full rounded-2xl border border-line bg-surface-2 p-3 text-corpo" />
      </Campo>
      {semNome && <p className="text-apoio text-danger" role="alert">Informe seu nome para assinar o registro.</p>}
      <Button block icon="check" disabled={!pode} onClick={() => void salvar()}>{salvando ? 'Guardando…' : 'Guardar para diagnóstico'}</Button>
    </div>
  )
}
