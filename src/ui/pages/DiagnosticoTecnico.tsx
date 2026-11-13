import { Link } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { LIMIARES } from '@/domain/climate'
import type { Arvore, Categoria } from '@/domain/diagnosis'
import { GANHO_MINIMO, NEUTRO, TETO_PCT, VEROSSIMILHANCA, type Frequencia } from '@/domain/funil'
import { SLA_CHECAGEM_H } from '@/domain/hibrido'
import { DEFAULT_BUFFER_M, MAX_POINTS, MIN_POINTS, MIN_SPACING_M } from '@/domain/sampling'
import { FATOR_OUTLIER, MAX_POR_UNIDADE, PRECISAO_MAX_GPS_M, REGRAS_VALIDACAO, TOLERANCIA_GPS_M } from '@/domain/validation'
import { ALVOS, LISTA_ALVOS, type AlvoId } from '@/knowledge/alvos'
import { ARVORES } from '@/knowledge/arvores'
import { CANDIDATOS, PERGUNTAS } from '@/knowledge/diagnostico'
import { FONTES } from '@/knowledge/fontes'
import { REGRAS } from '@/knowledge/regras'
import { SINTOMA_SINAL } from '@/knowledge/sintomaSinal'
import { NIVEL_ACAO } from '@/domain/decision'
import { Icon } from '../components/Icon'
import { Badge, Card, Segmentado, type Tom } from '../components/kit'

type Aba = 'visao' | 'amostragem' | 'niveis' | 'validacao' | 'diagnostico' | 'regras' | 'fontes'

/** Texto curto de uma seção: o que ela mostra e de onde vem cada número (tudo lido do código, nada copiado à mão). */
const Intro = ({ children }: { children: ReactNode }) => <p className="text-text-2 leading-relaxed">{children}</p>
const Projeto = () => <Badge tom="neutral" icon="info">Decisão de projeto</Badge>
const DaFonte = () => <Badge tom="ok" icon="check">Fonte Embrapa</Badge>

/* ───────────────────────── 1. Visão geral ───────────────────────── */

const ETAPAS: { n: number; titulo: string; texto: string; onde: string; aba?: Aba }[] = [
  { n: 1, titulo: 'Plano de amostragem', texto: 'Do contorno desenhado no mapa, o app calcula quantos pontos amostrar e onde, andando em zigzag ou nas diagonais, longe da borda.', onde: 'Talhões', aba: 'amostragem' },
  { n: 2, titulo: 'Registro no ponto', texto: 'O amostrador conta ou avalia o alvo e o app grava junto estádio, data e hora, posição, método e responsável.', onde: 'Coleta' },
  { n: 3, titulo: 'Validação', texto: 'Treze regras (V01 a V13) barram dado impossível e pedem foto quando há decisão em jogo.', onde: 'Coleta', aba: 'validacao' },
  { n: 4, titulo: 'Nível de ação', texto: 'Cada registro é comparado ao limite publicado pela Embrapa. Sem limite numérico, vira "detecção" para o agrônomo decidir.', onde: 'Coleta e Talhão', aba: 'niveis' },
  { n: 5, titulo: 'Leitura do talhão', texto: 'Os pontos viram mapa de calor, série no tempo e resultado por alvo. O risco pelo clima abre ordens de checagem.', onde: 'Talhão e Alertas' },
  { n: 6, titulo: 'Decisão do agrônomo', texto: 'O app nunca manda aplicar produto. Ele organiza a evidência (números, fotos, mapa, fonte) para quem decide.', onde: 'Relatório em PDF' },
]

function Visao({ ir }: { ir: (a: Aba) => void }) {
  return (
    <div className="space-y-5">
      <Intro>Esta área mostra <b className="text-text">como o app chega a cada resultado</b>, passo a passo. Todos os números abaixo vêm direto do código do aplicativo: se um limite mudar lá, muda aqui.</Intro>
      <ol className="space-y-3">
        {ETAPAS.map((e) => (
          <li key={e.n}>
            <Card className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-subtitulo font-bold text-brand" aria-hidden>{e.n}</span>
              <div className="min-w-0 space-y-1">
                <h2 className="text-subtitulo">{e.titulo}</h2>
                <p className="text-text-2">{e.texto}</p>
                <p className="flex flex-wrap items-center gap-2 text-apoio text-text-2">
                  <span>Onde: <b className="text-text">{e.onde}</b></span>
                  {e.aba && <button type="button" onClick={() => ir(e.aba!)} className="inline-flex min-h-9 items-center gap-1 font-semibold text-brand underline">Ver as regras<Icon name="seta" size={14} /></button>}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Card className="space-y-2 bg-surface-2">
        <h2 className="text-secao">Três princípios</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-text-2">
          <li><b className="text-text">Só afirma o que a fonte sustenta.</b> Limite numérico só aparece onde a Embrapa publica um; o resto é marcado como decisão de projeto.</li>
          <li><b className="text-text">Não finge certeza.</b> O diagnóstico é um índice de compatibilidade, nunca passa de {TETO_PCT}%, e abaixo de 50% o app diz que ainda não dá para dizer.</li>
          <li><b className="text-text">A decisão é humana.</b> Nenhuma tela recomenda aplicar defensivo.</li>
        </ul>
      </Card>
    </div>
  )
}

/* ───────────────────────── 2. Amostragem ───────────────────────── */

function Amostragem() {
  const linhas: [string, string, ReactNode][] = [
    ['Quantos pontos', `${MIN_POINTS} pontos até 50 ha; mais 1 ponto a cada 10 ha acima disso; no máximo ${MAX_POINTS}.`, <Projeto key="p" />],
    ['Bordadura', `Nenhum ponto a menos de ${DEFAULT_BUFFER_M} m da borda do talhão, para evitar o efeito de borda.`, <Projeto key="p" />],
    ['Espaçamento', `O espaçamento médio entre pontos deve ser de pelo menos ${MIN_SPACING_M} m; o app avisa quando o plano não consegue cumprir isso.`, <Projeto key="p" />],
    ['Caminhamento', 'Zigzag (vai e volta pelo talhão) ou duas diagonais cruzadas. Os pontos são tirados do traçado, espaçados ao longo dele.', <Projeto key="p" />],
    ['Orientação', 'O traçado gira para acompanhar o talhão: o app testa ângulos de 3 em 3 graus e fica com o que dá o menor retângulo em volta.', <Projeto key="p" />],
  ]
  return (
    <div className="space-y-4">
      <Intro>Como o app transforma o contorno do talhão em pontos de coleta. Nada aqui é "lido de uma fonte": são escolhas da equipe do projeto, para serem revistas com o agrônomo.</Intro>
      <div className="space-y-3">
        {linhas.map(([t, d, b]) => (
          <Card key={t} className="space-y-1.5"><div className="flex flex-wrap items-center gap-2"><h2 className="text-subtitulo">{t}</h2>{b}</div><p className="text-text-2">{d}</p></Card>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────── 3. Níveis de ação ───────────────────────── */

/** O que o motor de decisão faz com cada alvo, em palavras. Os números vêm de NIVEL_ACAO. */
function regraDoAlvo(id: AlvoId): { nivel: string; numerico: boolean } {
  const n = NIVEL_ACAO
  switch (id) {
    case 'percevejo': return { nivel: `${n.percevejo.graos} por metro (grãos) ou ${n.percevejo.sementes} por metro (sementes), a partir de R3`, numerico: true }
    case 'lagarta': case 'anticarsia': return { nivel: `${n.lagartaPorMetro} lagartas maiores que 1,5 cm por metro, ou desfolha de ${n.desfolhaVegetativa}% (vegetativo) / ${n.desfolhaReprodutiva}% (reprodutivo)`, numerico: true }
    case 'spodoptera': return { nivel: `${n.spodopteraPorMetro} lagartas por metro, ou desfolha de ${n.desfolhaVegetativa}% / ${n.desfolhaReprodutiva}%`, numerico: true }
    case 'helicoverpa': return { nivel: `${n.helicoverpaPorMetro.vegetativo} por metro (vegetativo) ou ${n.helicoverpaPorMetro.reprodutivo} por metro (reprodutivo), ou desfolha de ${n.desfolhaVegetativa}% / ${n.desfolhaReprodutiva}%`, numerico: true }
    case 'broca': return { nivel: `${n.brocaPlantasPct}% das plantas com ponteiros atacados`, numerico: true }
    case 'tamandua': return { nivel: `${n.tamanduaAteV3} adulto por metro até V3; ${n.tamanduaV4aV6} de V4 a V6; depois de V6, sem perdas`, numerico: true }
    default: return { nivel: 'Sem limite numérico nas fontes: qualquer registro acima de zero vira "detecção" e exige foto', numerico: false }
  }
}

function Niveis() {
  return (
    <div className="space-y-4">
      <Intro>Para cada alvo, o que o app compara com o número que o amostrador registrou. Ao chegar em <b className="text-text">{Math.round(NIVEL_ACAO.proximoFracao * 100)}%</b> do limite, o resultado vira "próximo do nível de ação" e pede nova amostragem em 2 a 3 dias. Atingido o limite, o app diz "nível de ação atingido, decisão do agrônomo". Alvo sem limite publicado vira <b className="text-text">detecção</b>, nunca recomendação.</Intro>
      <ul className="space-y-3">
        {LISTA_ALVOS.map((a) => {
          const r = regraDoAlvo(a.id)
          return (
            <li key={a.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-subtitulo">{a.nome}</h2>
                  <Badge tom={r.numerico ? 'ok' : 'neutral'}>{r.numerico ? 'Nível de ação' : 'Detecção'}</Badge>
                  {a.rotina && <Badge tom="info">Rotina</Badge>}
                </div>
                <p className="text-text-2">{r.nivel}.</p>
                <p className="text-apoio text-text-2">Avaliado a partir de <b className="text-text">{a.estadioMin}</b> · medida: {a.unidade}{ALVOS[a.id].desfolha ? ' + desfolha (%)' : ''}</p>
                <p className="text-apoio text-text-2">Fontes: {a.fontes.map((id) => FONTES[id].rotulo).join(' · ')}</p>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ───────────────────────── 4. Validação ───────────────────────── */

function Validacao() {
  return (
    <div className="space-y-4">
      <Intro>Antes de salvar, o registro passa por {REGRAS_VALIDACAO.length} regras. <b className="text-text">Erro</b> impede de salvar; <b className="text-text">aviso</b> deixa salvar e mostra o motivo. Cada regra tem um código fixo, que aparece na tela e no Projeto Técnico.</Intro>
      <ul className="space-y-3">
        {REGRAS_VALIDACAO.map((r) => (
          <li key={r.codigo}>
            <Card className="flex gap-4">
              <span className="shrink-0 font-mono text-subtitulo font-bold text-brand">{r.codigo}</span>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-subtitulo">{r.titulo}</h2><Badge tom={r.gravidade === 'erro' ? 'danger' : 'warn'}>{r.gravidade === 'erro' ? 'Impede salvar' : 'Aviso'}</Badge></div>
                <p className="text-text-2">{r.quando}</p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ───────────────────────── 5. Diagnóstico ───────────────────────── */

const FREQ: Record<Frequencia, { texto: string; tom: Tom }> = {
  tipico: { texto: 'Típico', tom: 'ok' }, comum: { texto: 'Comum', tom: 'info' }, possivel: { texto: 'Possível', tom: 'neutral' },
  raro: { texto: 'Raro', tom: 'warn' }, incompativel: { texto: 'Incompatível', tom: 'danger' },
}
const ORDEM_FREQ: Frequencia[] = ['tipico', 'comum', 'possivel', 'raro', 'incompativel']

function PerfilDaCausa() {
  const [id, setId] = useState(CANDIDATOS.find((c) => c.id === 'ferrugem')?.id ?? CANDIDATOS[0]!.id)
  const c = CANDIDATOS.find((x) => x.id === id)!
  const linhas = PERGUNTAS.flatMap((p) => {
    const perfil = c.perfil[p.id]
    if (!perfil) return []
    return [{ pergunta: p.texto, itens: p.opcoes.filter((o) => perfil[o.id]).map((o) => ({ resposta: o.rotulo, f: perfil[o.id]! })).sort((a, b) => ORDEM_FREQ.indexOf(a.f) - ORDEM_FREQ.indexOf(b.f)) }]
  })
  return (
    <Card className="space-y-4">
      <h2 className="text-secao">Perfil de uma causa</h2>
      <p className="text-text-2">Cada causa (praga, doença ou problema não vivo) tem um perfil: para cada pergunta, quão típica é cada resposta. É a "ficha" que o app compara com o que o usuário viu. Escolha uma para ver a dela.</p>
      <label className="block">
        <span className="mb-1 block text-apoio font-semibold">Causa</span>
        <select value={id} onChange={(e) => setId(e.target.value)} className="min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-corpo">
          {CANDIDATOS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{c.nome}</h3>{c.origem === 'fonte' ? <DaFonte /> : <Projeto />}</div>
      {linhas.length === 0 ? <p className="text-text-2">Esta causa não tem perfil de respostas (entra só pela ficha da Biblioteca).</p> : (
        <ul className="space-y-3">
          {linhas.map((l) => (
            <li key={l.pergunta} className="rounded-xl bg-surface-2 p-3">
              <p className="font-semibold">{l.pergunta}</p>
              <ul className="mt-2 flex flex-wrap gap-2">{l.itens.map((i) => <li key={i.resposta}><Badge tom={FREQ[i.f].tom}>{i.resposta}: {FREQ[i.f].texto.toLowerCase()}</Badge></li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Diagnostico() {
  return (
    <div className="space-y-5">
      <Intro>O diagnóstico guiado compara o que o usuário viu com o perfil de <b className="text-text">{CANDIDATOS.length} causas</b>, usando <b className="text-text">{PERGUNTAS.length} perguntas</b>. A cada resposta, o app refaz a conta e escolhe a próxima pergunta. Veja o passo a passo.</Intro>

      <Card className="space-y-3">
        <h2 className="text-secao">Como a conta é feita</h2>
        <ol className="list-decimal space-y-2 pl-5 text-text-2">
          <li><b className="text-text">Ponto de partida igual para todas.</b> Nenhuma causa começa na frente; o app não afirma qual é mais comum.</li>
          <li><b className="text-text">Cada resposta multiplica a compatibilidade</b> de cada causa pelo peso da tabela abaixo, conforme o perfil dela. Resposta que o perfil não descreve pesa {NEUTRO} para todas.</li>
          <li><b className="text-text">Pergunta subjetiva pesa menos.</b> "Que tom de amarelo?" puxa menos que "tem bicho?", porque quem não é técnico erra mais a primeira.</li>
          <li><b className="text-text">A fase da lavoura entra.</b> Fora da janela em que a causa costuma aparecer, a compatibilidade cai (1 fase de distância: ×0,7; até 3 fases: ×0,4; mais longe: ×0,15). Cai, mas não zera.</li>
          <li><b className="text-text">Foto escolhida é evidência fraca.</b> Escolher uma foto de comparação multiplica por 2,5; foto mostrada e não escolhida, por 0,8; "nenhuma parece" reduz as mostradas (×0,6); "não sei" não muda nada.</li>
          <li><b className="text-text">A próxima pergunta é a que mais separa</b> as causas que sobraram (ganho de informação). Quando nenhuma separa mais que {GANHO_MINIMO} bit, ou a confiança já é alta, o app encerra.</li>
        </ol>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-secao">Peso de cada tipo de resposta</h2>
        <p className="text-text-2">Escala qualitativa escolhida pela equipe (decisão de projeto), ainda a calibrar com casos reais.</p>
        <ul className="grid gap-2 sm:grid-cols-5">
          {ORDEM_FREQ.map((f) => <li key={f} className="rounded-xl bg-surface-2 p-3 text-center"><Badge tom={FREQ[f].tom}>{FREQ[f].texto}</Badge><p className="mt-1.5 text-subtitulo font-bold tabular-nums">{String(VEROSSIMILHANCA[f]).replace('.', ',')}</p></li>)}
        </ul>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-secao">O que o usuário vê no final</h2>
        <ul className="list-disc space-y-2 pl-5 text-text-2">
          <li><b className="text-text">Índice de certeza:</b> a compatibilidade da primeira causa, limitada pela quantidade de evidência: <b className="text-text">40% + 7 pontos por resposta</b>, com teto de {TETO_PCT}%. Poucas respostas nunca dão número alto. Não é probabilidade calibrada.</li>
          <li><b className="text-text">Confiança:</b> "bem provável" exige primeira causa com pelo menos 70% e o dobro da segunda; "provável", pelo menos 40% e 1,5 vez a segunda; senão, "ainda incerto".</li>
          <li><b className="text-text">Veredito:</b> só dá nome ao problema com certeza de 50% ou mais e confiança que não seja baixa. Abaixo disso, mostra as possibilidades sem apontar uma como resposta.</li>
        </ul>
      </Card>

      <PerfilDaCausa />
    </div>
  )
}

/* ───────────────────────── 6. Árvores, quadro e regras ───────────────────────── */

const CAT: Record<Categoria, { tom: Tom; texto: string }> = {
  abiotico: { tom: 'info', texto: 'Causa abiótica' }, biotico: { tom: 'danger', texto: 'Causa biótica' },
  inconclusivo: { tom: 'warn', texto: 'Inconclusivo' }, investigar: { tom: 'warn', texto: 'Investigar' },
}
const Origem = ({ o }: { o: Arvore['origem'] }) => (o === 'fonte' ? <DaFonte /> : <Projeto />)

function Fontes({ ids }: { ids: Arvore['fontes'] }) {
  return (
    <p className="text-apoio text-text-2">
      Fontes: {ids.map((id, i) => {
        const f = FONTES[id]
        return <span key={id}>{i > 0 && ' · '}{'url' in f ? <a className="underline" href={f.url} target="_blank" rel="noreferrer">{f.rotulo}</a> : f.rotulo}</span>
      })}
    </p>
  )
}

/** A árvore inteira em leitura: cada pergunta com os caminhos que saem dela e onde cada um chega. */
function ArvoreAberta({ a }: { a: Arvore }) {
  const destino = (id: string): ReactNode => {
    const n = a.nos[id]
    if (!n) return id
    return n.tipo === 'resultado' ? <><Badge tom={CAT[n.categoria].tom}>{CAT[n.categoria].texto}</Badge> <b>{n.titulo}</b></> : <>vai para a pergunta “{n.texto}”</>
  }
  const nos = Object.entries(a.nos)
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{a.titulo}</h3><Origem o={a.origem} /></div>
      <p className="text-text-2">{a.descricao}</p>
      <ol className="space-y-3">
        {nos.filter(([, n]) => n.tipo === 'pergunta').map(([id, n]) => n.tipo === 'pergunta' && (
          <li key={id} className="rounded-xl bg-surface-2 p-3">
            <p className="font-semibold">{id === a.raiz ? 'Começa em: ' : ''}{n.texto}</p>
            <ul className="mt-2 space-y-1.5 text-apoio">
              {n.opcoes.map((o) => <li key={o.rotulo} className="leading-snug"><span className="text-text-2">Se </span><b>{o.rotulo}</b><span className="text-text-2"> → </span>{destino(o.destino)}</li>)}
            </ul>
          </li>
        ))}
      </ol>
      <Fontes ids={a.fontes} />
    </Card>
  )
}

function Regras() {
  return (
    <div className="space-y-6">
      <Intro>O raciocínio de diferenciação que o projeto pede (Bloco 2), mostrado inteiro e sem clicar em nada: árvores de decisão, o quadro sintoma × sinal e as regras SE … ENTÃO. Cada item diz se vem de fonte da Embrapa ou se é raciocínio da equipe.</Intro>

      <section className="space-y-3" aria-labelledby="h-arvores">
        <h2 id="h-arvores" className="text-secao">Árvores de decisão</h2>
        {ARVORES.map((a) => <ArvoreAberta key={a.id} a={a} />)}
      </section>

      <section className="space-y-3" aria-labelledby="h-quadro">
        <h2 id="h-quadro" className="text-secao">Sintoma × sinal</h2>
        <Intro><b className="text-text">Sintoma</b> é o que a planta mostra e o produtor vê. <b className="text-text">Sinal</b> é a estrutura do próprio agente (pústula, micélio, escleródio) e é o que confirma a doença.</Intro>
        {SINTOMA_SINAL.map((l) => (
          <Card key={l.doenca} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{l.doenca}</h3><Badge tom={l.cultura === 'soja' ? 'ok' : 'neutral'}>{l.cultura}</Badge></div>
            <p><b>Sintoma: </b>{l.sintoma}</p>
            <p><b>Sinal: </b>{l.sinal}</p>
            <p><b>Onde procurar: </b>{l.onde}</p>
            {l.aConfirmar && <p className="text-apoio text-warn">A confirmar: {l.aConfirmar}</p>}
          </Card>
        ))}
      </section>

      <section className="space-y-3" aria-labelledby="h-regras">
        <h2 id="h-regras" className="text-secao">Regras SE … ENTÃO</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {REGRAS.map((r) => (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-subtitulo">{r.titulo}</h3><Origem o={r.origem} /></div>
              <p className="font-mono text-apoio leading-relaxed">
                {r.se.map((c, i) => <span key={c} className="block"><b className="text-brand">{i === 0 ? 'SE' : 'E'}</b> {c}</span>)}
                <span className="block"><b className="text-brand">ENTÃO</b> {r.entao}</span>
                {r.senao && <span className="mt-2 block text-text-2"><b>SENÃO </b>{r.senao}</span>}
              </p>
              <Fontes ids={r.fontes} />
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ───────────────────────── 7. Fontes e decisões de projeto ───────────────────────── */

function FontesEDecisoes() {
  const lista = Object.values(FONTES)
  const projeto: [string, string][] = [
    ['Amostragem', `${MIN_POINTS} a ${MAX_POINTS} pontos, bordadura de ${DEFAULT_BUFFER_M} m, espaçamento mínimo de ${MIN_SPACING_M} m.`],
    ['Risco de ferrugem pelo clima', `Temperatura média de ${LIMIARES.ferrugem.tMin} a ${LIMIARES.ferrugem.tMax} °C e pelo menos ${LIMIARES.ferrugem.horasMolhadasDia} h molhadas por dia. Em ${LIMIARES.janelaDias} dias: ${LIMIARES.ferrugem.diasModerado} dias favoráveis = moderado; ${LIMIARES.ferrugem.diasAlto} = alto.`],
    ['Risco de mofo-branco pelo clima', `Temperatura média de ${LIMIARES.mofo.tMin} a ${LIMIARES.mofo.tMax} °C e pelo menos ${LIMIARES.mofo.horasMolhadasDia} h molhadas por dia. Em ${LIMIARES.janelaDias} dias: ${LIMIARES.mofo.diasModerado} dias favoráveis = moderado; ${LIMIARES.mofo.diasAlto} = alto.`],
    ['Hora "molhada"', `Umidade de ${LIMIARES.umidadeMolhadaPct}% ou mais, ou chuva de ${String(LIMIARES.chuvaMolhadaMm).replace('.', ',')} mm ou mais (aproximação do molhamento da folha).`],
    ['Ordem de checagem', `O agrônomo tem ${SLA_CHECAGEM_H} horas para checar uma ordem de checagem aberta pelo risco do clima.`],
    ['Validação', `Valor maior que ${FATOR_OUTLIER}× a média histórica pede foto; limite de ${MAX_POR_UNIDADE} por unidade; GPS a mais de ${TOLERANCIA_GPS_M} m do talhão ou pior que ±${PRECISAO_MAX_GPS_M} m gera aviso.`],
    ['Diagnóstico', `Pesos das respostas, peso por fase da lavoura e por foto, índice de certeza (40% + 7 por resposta, teto de ${TETO_PCT}%). Ainda a calibrar com casos reais.`],
  ]
  return (
    <div className="space-y-5">
      <Intro>O que vem de publicação da Embrapa e o que é escolha da equipe. A regra do projeto: <b className="text-text">fato com fonte; decisão de projeto declarada como tal</b>.</Intro>
      <Card className="space-y-3">
        <h2 className="text-secao">Decisões de projeto (valores atuais)</h2>
        <ul className="space-y-2.5">{projeto.map(([t, d]) => <li key={t}><p className="font-semibold">{t}</p><p className="text-apoio text-text-2">{d}</p></li>)}</ul>
      </Card>
      <Card className="space-y-3">
        <h2 className="text-secao">Fontes consultadas</h2>
        <ul className="space-y-3">
          {lista.map((f) => (
            <li key={f.id} className="space-y-0.5">
              <p className="flex flex-wrap items-center gap-2 font-semibold">{f.rotulo}<Badge tom={f.tipo === 'confirmada' ? 'ok' : 'neutral'}>{f.tipo === 'confirmada' ? 'Fonte' : 'Projeto'}</Badge></p>
              <p className="text-apoio text-text-2">{f.citacao}{'url' in f && f.url && <> <a className="font-semibold text-brand underline" href={f.url} target="_blank" rel="noreferrer">Abrir</a></>}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

/* ───────────────────────── Página ───────────────────────── */

export function DiagnosticoTecnico() {
  const [aba, setAba] = useState<Aba>('visao')
  return (
    <>
      <header className="mb-4 flex items-center gap-1">
        <Link to="/diagnostico" aria-label="Voltar para Diagnóstico" className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 transition active:bg-surface-2"><Icon name="voltar" size={24} /></Link>
        <div className="min-w-0">
          <h1 className="text-secao">Material do técnico</h1>
          <p className="text-apoio text-text-2">Como o app decide, por dentro: regras, números e fontes.</p>
        </div>
      </header>
      <div className="mb-5">
        <Segmentado rotulo="Seção" valor={aba} onChange={setAba} opcoes={[
          { id: 'visao', nome: 'Visão geral' }, { id: 'amostragem', nome: 'Amostragem' }, { id: 'niveis', nome: 'Níveis de ação' }, { id: 'validacao', nome: 'Validação' },
          { id: 'diagnostico', nome: 'Diagnóstico' }, { id: 'regras', nome: 'Árvores e regras' }, { id: 'fontes', nome: 'Fontes' },
        ]} />
      </div>
      <div className="mx-auto max-w-3xl">
        {aba === 'visao' && <Visao ir={setAba} />}
        {aba === 'amostragem' && <Amostragem />}
        {aba === 'niveis' && <Niveis />}
        {aba === 'validacao' && <Validacao />}
        {aba === 'diagnostico' && <Diagnostico />}
        {aba === 'regras' && <Regras />}
        {aba === 'fontes' && <FontesEDecisoes />}
      </div>
    </>
  )
}
