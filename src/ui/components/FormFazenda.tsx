import { useEffect, useState } from 'react'
import { useFazenda } from '@/data/hooks'
import { repo } from '@/data/repo'
import { FUSO_PADRAO, safraAtual } from '@/domain/tempo'
import { useToast } from '../state/toast'
import { Button, Campo, Card, Input } from './kit'

export function FormFazenda() {
  const fazenda = useFazenda()
  const mostrar = useToast((s) => s.mostrar)
  const [nome, setNome] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [uf, setUf] = useState('MT')
  const [safra, setSafra] = useState(() => safraAtual(new Date()))
  const [proprietario, setProprietario] = useState('')
  const [responsavel, setResponsavel] = useState('')
  const [carregou, setCarregou] = useState(false)

  // Preenche o formulário uma única vez com o que já está salvo (não sobrescreve o que a pessoa digita).
  useEffect(() => {
    if (carregou || fazenda === undefined) return
    if (fazenda === null) { setCarregou(true); return }
    setNome(fazenda.nome); setMunicipio(fazenda.municipio); setUf(fazenda.uf); setSafra(fazenda.safra)
    setProprietario(fazenda.proprietario ?? ''); setResponsavel(fazenda.responsavelTecnico ?? '')
    setCarregou(true)
  }, [fazenda, carregou])

  const valida = nome.trim().length >= 2 && municipio.trim().length >= 2 && /^[A-Za-z]{2}$/.test(uf.trim()) && /^\d{2}\/\d{2}$/.test(safra.trim())

  async function salvar() {
    if (!valida) return
    await repo.salvarFazenda({
      nome: nome.trim(), municipio: municipio.trim(), uf: uf.trim().toUpperCase(), safra: safra.trim(), fuso: fazenda?.fuso ?? FUSO_PADRAO,
      ...(proprietario.trim() ? { proprietario: proprietario.trim() } : {}),
      ...(responsavel.trim() ? { responsavelTecnico: responsavel.trim() } : {}),
    })
    mostrar('Fazenda salva')
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-secao">Fazenda</h2>
      <p className="text-apoio text-text-2">Aparece no início, nos diagnósticos e nos relatórios. Fica só neste aparelho.</p>
      <Campo rotulo="Nome da fazenda"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Fazenda Boa Esperança" maxLength={80} /></Campo>
      <div className="grid grid-cols-[1fr_5rem] gap-3">
        <Campo rotulo="Município"><Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Lucas do Rio Verde" maxLength={60} /></Campo>
        <Campo rotulo="UF"><Input value={uf} onChange={(e) => setUf(e.target.value.slice(0, 2))} maxLength={2} autoCapitalize="characters" /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Safra" ajuda="Formato 25/26"><Input value={safra} onChange={(e) => setSafra(e.target.value)} inputMode="numeric" maxLength={5} /></Campo>
        <Campo rotulo="Fuso horário" ajuda="Fixo no da fazenda"><Input value="Cuiabá (UTC-4)" readOnly aria-readonly /></Campo>
      </div>
      <Campo rotulo="Proprietário (opcional)"><Input value={proprietario} onChange={(e) => setProprietario(e.target.value)} maxLength={80} /></Campo>
      <Campo rotulo="Responsável técnico (opcional)" ajuda="Assina os registros novos como responsável."><Input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} maxLength={80} /></Campo>
      <Button block disabled={!valida} onClick={() => void salvar()}>Salvar fazenda</Button>
    </Card>
  )
}
