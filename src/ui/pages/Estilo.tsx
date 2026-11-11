import { useState } from 'react'
import { Badge, Button, Campo, Card, Input, Segmentado, Select, Stat, Titulo, Vazio } from '../components/kit'

export function Estilo() {
  const [alvo, setAlvo] = useState('percevejo')
  return (
    <div className="space-y-8">
      <Titulo sub="Componentes e estados. Esta página é só para desenvolvimento e revisão visual.">Guia de estilo</Titulo>

      <section className="space-y-3">
        <h2 className="text-subtitulo">Estados de decisão</h2>
        <div className="flex flex-wrap gap-2">
          <Badge tom="ok" icon="check">Abaixo do nível</Badge>
          <Badge tom="warn" icon="alerta">Próximo do nível</Badge>
          <Badge tom="danger" icon="alerta">Nível de ação atingido</Badge>
          <Badge tom="info" icon="info">Detecção: decisão do agrônomo</Badge>
          <Badge tom="neutral">Fora da janela</Badge>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat rotulo="Pontos amostrados" valor="7 / 12" detalhe="58% do plano" />
        <Stat rotulo="Acima do nível" valor="2" tom="danger" detalhe="P03 e P04" />
        <Stat rotulo="Risco de ferrugem" valor="Alto" tom="warn" detalhe="5 de 7 dias favoráveis" />
        <Stat rotulo="Zeros registrados" valor="9" tom="ok" detalhe="o zero também é dado" />
      </section>

      <section className="space-y-3">
        <h2 className="text-subtitulo">Botões</h2>
        <div className="flex flex-wrap gap-3">
          <Button icon="camera">Tirar foto</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver detalhes</Button>
          <Button variant="danger">Apagar</Button>
          <Button disabled>Desabilitado</Button>
        </div>
      </section>

      <Card className="space-y-4">
        <h2 className="text-subtitulo">Formulário de registro</h2>
        <Campo rotulo="Alvo">
          <Segmentado rotulo="Alvo" valor={alvo} onChange={setAlvo} opcoes={[{ id: 'percevejo', nome: 'Percevejo-marrom' }, { id: 'lagarta', nome: 'Lagarta' }, { id: 'ferrugem', nome: 'Ferrugem' }, { id: 'mofo', nome: 'Mofo-branco', desabilitado: true }]} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Estádio fenológico" ajuda="Ex.: R3 = início de formação de vagens">
            <Select defaultValue="R3"><option>V4</option><option>R1</option><option>R3</option></Select>
          </Campo>
          <Campo rotulo="Quantidade por metro" erro="Máximo de 100 por unidade de amostragem.">
            <Input type="number" inputMode="numeric" defaultValue={140} aria-invalid />
          </Campo>
        </div>
      </Card>

      <Vazio icone="mapa" titulo="Nenhum talhão ainda" texto="Desenhe o contorno do primeiro talhão no mapa para gerar o plano de amostragem." acao={<Button icon="mais1">Desenhar talhão</Button>} />
    </div>
  )
}
