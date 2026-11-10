import maplibregl, { type GeoJSONSource, type Map as MLMap, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import { useEffect, useRef, useState } from 'react'
import type { Talhao } from '@/domain/entidades'
import type { LngLat } from '@/domain/geo'
import type { PlanPoint } from '@/domain/sampling'
import type { CelulaCalor } from '@/domain/resultados'
import { circuloGeo } from '@/domain/navegacao'
import { COR_ESTADO, type MarcadorPonto } from './estadoPonto'
import { Icon } from './Icon'

type Base = 'satelite' | 'ruas'

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    satelite: {
      type: 'raster', tileSize: 256, maxzoom: 17,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Imagens © Esri, Maxar, Earthstar Geographics',
    },
    ruas: {
      type: 'raster', tileSize: 256, maxzoom: 18,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'satelite', type: 'raster', source: 'satelite' },
    { id: 'ruas', type: 'raster', source: 'ruas', layout: { visibility: 'none' } },
  ],
}

/** Folga ao enquadrar: sobra espaço para os botões à direita e a atribuição embaixo. */
/** Limites de zoom. Na região da fazenda a imagem de satélite real vai até o nível 17; acima disso o servidor devolve "Map data not yet available". Abaixo de 12 o talhão some. */
const MAX_ZOOM = 17
const MIN_ZOOM = 12

const MARGEM = { top: 48, left: 32, right: 56, bottom: 44 }

const TEXTOS = {
  'CooperativeGesturesHandler.MobileHelpText': 'Use dois dedos para mover o mapa',
  'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + rolagem para dar zoom',
  'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + rolagem para dar zoom',
}

const pos = (p: LngLat): [number, number] => [p[0], p[1]]
/** Selo de câmera no canto do marcador. */
function selo(): HTMLElement {
  const b = document.createElement('span')
  b.setAttribute('aria-hidden', 'true')
  b.style.cssText = 'position:absolute;right:-5px;top:-6px;width:16px;height:16px;border-radius:9999px;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 1.5px #0b1410'
  b.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#0b1410" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>'
  return b
}

const vazio = (): FeatureCollection => ({ type: 'FeatureCollection', features: [] })
const feat = (geometry: Geometry, properties: GeoJsonProperties = {}): Feature => ({ type: 'Feature', geometry, properties })

interface Props {
  talhoes: readonly Talhao[]
  selecionadoId: string | null
  onSelecionar: (id: string) => void
  pontos?: readonly PlanPoint[]
  /** Pontos com estado (Coleta e Resultados). Quando informado, substitui `pontos`. */
  marcadores?: readonly MarcadorPonto[]
  pontoSelecionado?: string | null
  pontoProximo?: string | null
  onPonto?: (id: string) => void
  /** Mapa de calor georreferenciado (grade IDW); `teto` é o valor que vira a cor mais forte. */
  calor?: { celulas: readonly CelulaCalor[]; teto: number } | null
  caminho?: readonly (readonly LngLat[])[]
  /** Vértices do talhão em desenho. */
  desenho?: readonly LngLat[] | null
  onVertice?: (p: LngLat) => void
  enquadrar: LngLat[] | null
  /** Miniatura sem gestos. Padrão: livre (um dedo rola a página, dois dedos movem o mapa). */
  travar?: boolean
  /** Leva a câmera até o ponto (use `n` diferente a cada pedido). */
  irPara?: { ponto: LngLat; n: number } | null
  /** Sua posição: ponto azul, círculo de imprecisão do GPS e, andando, a direção. */
  eu?: { posicao: LngLat; precisaoM: number; rumo: number | null } | null
  /** Linha do guia, da sua posição até o ponto de destino. */
  guia?: { de: LngLat; ate: LngLat } | null
  /** Com o guia ligado, a câmera acompanha você e o destino até você mexer no mapa. */
  seguir?: boolean
  className?: string
}

/** Base única de mapa (MapLibre) com o talhão sempre ao fundo. */
export function Mapa({ talhoes, selecionadoId, onSelecionar, pontos = [], marcadores, pontoSelecionado = null, pontoProximo = null, onPonto, calor = null, caminho = [], desenho = null, onVertice, enquadrar, travar, irPara = null, eu = null, guia = null, seguir = false, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapa = useRef<MLMap | null>(null)
  const [pronto, setPronto] = useState(false)
  const [base, setBase] = useState<Base>('satelite')
  const [soltou, setSoltou] = useState(false) // a pessoa mexeu no mapa durante o guia: para de seguir
  const [limiteZoom, setLimiteZoom] = useState<{ max: boolean; min: boolean }>({ max: false, min: false })
  const fixo = travar ?? false
  // Os handlers do mapa são registrados uma vez; os valores atuais vêm por ref.
  const vivo = useRef<{ desenho: typeof desenho; onVertice: typeof onVertice; onSelecionar: typeof onSelecionar; onPonto: typeof onPonto; enquadre: maplibregl.LngLatBounds | null; mexeu: boolean; seguir: boolean }>({ desenho, onVertice, onSelecionar, onPonto, enquadre: null, mexeu: false, seguir: false })
  useEffect(() => { Object.assign(vivo.current, { desenho, onVertice, onSelecionar, onPonto, seguir }) })

  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({ container: el.current, style: ESTILO, center: [-55.805, -13.255], zoom: 14, maxZoom: MAX_ZOOM, minZoom: MIN_ZOOM, attributionControl: { compact: true }, cooperativeGestures: true, locale: TEXTOS })
    mapa.current = m
    m.on('load', () => {
      for (const id of ['talhoes', 'calor', 'caminho', 'eu-precisao', 'guia', 'desenho-linha', 'desenho-vertices']) m.addSource(id, { type: 'geojson', data: vazio() })
      m.addLayer({ id: 'talhoes-fill', type: 'fill', source: 'talhoes', paint: { 'fill-color': ['case', ['get', 'sel'], '#5ee19a', '#7cc7ff'], 'fill-opacity': ['case', ['get', 'sel'], 0.18, 0.08] } })
      m.addLayer({ id: 'calor', type: 'fill', source: 'calor', paint: { 'fill-antialias': false, 'fill-opacity': 0.62, 'fill-color': ['interpolate', ['linear'], ['get', 't'], 0, '#fff3b0', 0.5, '#f59f3a', 1, '#c0391f'] } })
      m.addLayer({ id: 'talhoes-line', type: 'line', source: 'talhoes', paint: { 'line-color': ['case', ['get', 'sel'], '#5ee19a', '#7cc7ff'], 'line-width': ['case', ['get', 'sel'], 3, 2] } })
      m.addLayer({ id: 'caminho', type: 'line', source: 'caminho', paint: { 'line-color': '#ffd666', 'line-width': 2, 'line-dasharray': [3, 3] } })
      m.addLayer({ id: 'eu-precisao', type: 'fill', source: 'eu-precisao', paint: { 'fill-color': '#2b7de9', 'fill-opacity': 0.16 } })
      m.addLayer({ id: 'guia-borda', type: 'line', source: 'guia', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 8 } })
      m.addLayer({ id: 'guia', type: 'line', source: 'guia', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2b7de9', 'line-width': 5 } })
      m.addLayer({ id: 'desenho-linha', type: 'line', source: 'desenho-linha', paint: { 'line-color': '#ffd666', 'line-width': 3 } })
      m.addLayer({ id: 'desenho-vertices', type: 'circle', source: 'desenho-vertices', paint: { 'circle-radius': 6, 'circle-color': '#ffd666', 'circle-stroke-color': '#0b1410', 'circle-stroke-width': 2 } })
      setPronto(true)
    })
    m.on('click', (e) => {
      const v = vivo.current
      if (v.desenho) { v.onVertice?.([e.lngLat.lng, e.lngLat.lat]); return }
      const hit = m.queryRenderedFeatures(e.point, { layers: ['talhoes-fill'] })[0]
      const id = hit?.properties?.['id']
      if (typeof id === 'string') v.onSelecionar(id)
    })
    m.on('mousemove', 'talhoes-fill', () => { if (!vivo.current.desenho) m.getCanvas().style.cursor = 'pointer' })
    m.on('mouseleave', 'talhoes-fill', () => { m.getCanvas().style.cursor = '' })
    // Se o contêiner mudar de tamanho (layout, rotação) e a pessoa ainda não mexeu no mapa, reenquadra o talhão.
    const marcarLimites = () => setLimiteZoom({ max: m.getZoom() >= MAX_ZOOM - 0.01, min: m.getZoom() <= MIN_ZOOM + 0.01 })
    m.on('zoom', marcarLimites)
    const ro = new ResizeObserver(() => {
      m.resize()
      const b = vivo.current.enquadre
      if (b && !vivo.current.mexeu && !vivo.current.seguir) m.fitBounds(b, { padding: MARGEM, maxZoom: MAX_ZOOM, duration: 0 })
    })
    for (const ev of ['dragstart', 'zoomstart'] as const) m.on(ev, (e) => { if ('originalEvent' in e && e.originalEvent) { vivo.current.mexeu = true; if (vivo.current.seguir) setSoltou(true) } })
    ro.observe(el.current)
    return () => { ro.disconnect(); m.remove(); mapa.current = null }
  }, [])

  const set = (id: string, data: FeatureCollection) => (mapa.current?.getSource(id) as GeoJSONSource | undefined)?.setData(data)

  useEffect(() => {
    if (!pronto) return
    set('talhoes', { type: 'FeatureCollection', features: talhoes.map((t) => feat({ type: 'Polygon', coordinates: [[...t.anel.map(pos), pos(t.anel[0]!)]] }, { id: t.id, nome: t.nome, sel: t.id === selecionadoId })) })
  }, [pronto, talhoes, selecionadoId])

  useEffect(() => {
    if (!pronto) return
    set('calor', { type: 'FeatureCollection', features: calor ? calor.celulas.map((c) => feat({ type: 'Polygon', coordinates: [[...c.anel.map(pos), pos(c.anel[0]!)]] }, { t: calor.teto > 0 ? Math.min(1, c.valor / calor.teto) : 0 })) : [] })
  }, [pronto, calor])

  useEffect(() => {
    if (!pronto) return
    set('caminho', { type: 'FeatureCollection', features: caminho.map((c) => feat({ type: 'LineString', coordinates: c.map(pos) })) })
  }, [pronto, caminho])

  // Pontos como marcadores HTML (botões): o número fica nítido, acessível e não depende de fontes de mapa.
  useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    const lista: MarcadorPonto[] = marcadores ? [...marcadores] : pontos.map((p) => ({ id: p.id, ordem: p.order, posicao: p.position, estado: 'a_coletar' as const, rotuloEstado: '' }))
    const marcas = lista.map((p) => {
      const cor = COR_ESTADO[p.estado]
      const sel = p.id === pontoSelecionado
      const n = document.createElement('button')
      n.type = 'button'
      n.textContent = p.estado === 'diagnostico' ? '?' : String(p.ordem)
      if (p.temFoto) n.appendChild(selo())
      n.title = p.rotuloEstado ? `Ponto ${p.ordem} · ${p.rotuloEstado}` : p.id
      n.setAttribute('aria-label', p.rotuloEstado ? `Ponto ${p.ordem}, ${p.rotuloEstado}` : `Ponto ${p.ordem}`)
      n.setAttribute('aria-pressed', String(sel))
      const tam = sel ? 38 : 30
      n.style.cssText = `width:${tam}px;height:${tam}px;border-radius:9999px;display:grid;place-items:center;font:700 ${sel ? 15 : 13}px system-ui;background:${cor.fundo};color:${cor.texto};border:${sel ? 4 : 2}px solid ${sel ? '#ffd666' : p.id === pontoProximo ? '#7cf0b0' : '#fff'};box-shadow:0 1px 5px #0008;cursor:${onPonto ? 'pointer' : 'default'};padding:0`
      n.addEventListener('click', (e) => { e.stopPropagation(); vivo.current.onPonto?.(p.id) })
      return new maplibregl.Marker({ element: n }).setLngLat(pos(p.posicao)).addTo(m)
    })
    return () => marcas.forEach((x) => x.remove())
  }, [pronto, pontos, marcadores, pontoSelecionado, pontoProximo, onPonto])

  useEffect(() => {
    if (!pronto) return
    const d = desenho ?? []
    set('desenho-vertices', { type: 'FeatureCollection', features: d.map((v) => feat({ type: 'Point', coordinates: pos(v) })) })
    set('desenho-linha', { type: 'FeatureCollection', features: d.length >= 2 ? [feat({ type: 'LineString', coordinates: (d.length >= 3 ? [...d, d[0]!] : [...d]).map(pos) })] : [] })
    if (mapa.current) mapa.current.getCanvas().style.cursor = desenho ? 'crosshair' : ''
  }, [pronto, desenho])

  useEffect(() => {
    if (!pronto || !enquadrar || enquadrar.length === 0) return
    const b = new maplibregl.LngLatBounds()
    for (const p of enquadrar) b.extend(pos(p))
    vivo.current.enquadre = b
    vivo.current.mexeu = false
    mapa.current?.resize()
    mapa.current?.fitBounds(b, { padding: MARGEM, maxZoom: MAX_ZOOM, duration: 400 })
  }, [pronto, enquadrar])

  // Sua posição: círculo de imprecisão (camada) + ponto azul (marcador HTML, que gira com o rumo quando você anda).
  const euMarca = useRef<maplibregl.Marker | null>(null)
  useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    set('eu-precisao', { type: 'FeatureCollection', features: eu ? [feat({ type: 'Polygon', coordinates: [[...circuloGeo(eu.posicao, Math.max(eu.precisaoM, 3)).map(pos), pos(circuloGeo(eu.posicao, Math.max(eu.precisaoM, 3))[0]!)]] })] : [] })
    if (!eu) { euMarca.current?.remove(); euMarca.current = null; return }
    if (!euMarca.current) {
      const n = document.createElement('div')
      n.setAttribute('role', 'img')
      n.setAttribute('aria-label', 'Sua posição')
      n.style.cssText = 'width:22px;height:22px;border-radius:9999px;background:#2b7de9;border:3px solid #fff;box-shadow:0 0 0 2px #2b7de966,0 2px 6px #0007;pointer-events:none'
      const seta = document.createElement('span')
      seta.dataset['seta'] = '1'
      seta.style.cssText = 'position:absolute;left:50%;top:-14px;margin-left:-6px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:11px solid #2b7de9;display:none'
      n.appendChild(seta)
      euMarca.current = new maplibregl.Marker({ element: n, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(pos(eu.posicao)).addTo(m)
    }
    euMarca.current.setLngLat(pos(eu.posicao)).setRotation(eu.rumo ?? 0)
    const seta = euMarca.current.getElement().querySelector<HTMLElement>('[data-seta]')
    if (seta) seta.style.display = eu.rumo === null ? 'none' : 'block'
  }, [pronto, eu])
  useEffect(() => () => { euMarca.current?.remove(); euMarca.current = null }, [])

  useEffect(() => {
    if (!pronto) return
    set('guia', { type: 'FeatureCollection', features: guia ? [feat({ type: 'LineString', coordinates: [pos(guia.de), pos(guia.ate)] })] : [] })
  }, [pronto, guia])

  // Seguir: enquadra você e o destino a cada leitura do GPS; um novo destino volta a seguir.
  const chaveDestino = guia ? `${guia.ate[0]},${guia.ate[1]}` : ''
  useEffect(() => { vivo.current.mexeu = false; setSoltou(false) }, [chaveDestino, seguir])
  const enquadrarGuia = (duracao: number) => {
    const m = mapa.current
    if (!m || !eu || !guia) return
    const b = new maplibregl.LngLatBounds(pos(eu.posicao), pos(eu.posicao))
    b.extend(pos(guia.ate))
    m.fitBounds(b, { padding: { top: 104, left: 40, right: 64, bottom: 48 }, maxZoom: MAX_ZOOM, duration: duracao })
  }
  useEffect(() => {
    if (!pronto || !seguir || soltou || !eu || !guia) return
    enquadrarGuia(600)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reenquadra a cada leitura nova do GPS e a cada destino novo
  }, [pronto, seguir, soltou, eu, chaveDestino])

  useEffect(() => {
    if (!pronto || !irPara) return
    mapa.current?.flyTo({ center: pos(irPara.ponto), zoom: 17, duration: 800 })
  }, [pronto, irPara])

  useEffect(() => {
    if (!pronto || !mapa.current) return
    mapa.current.setLayoutProperty('satelite', 'visibility', base === 'satelite' ? 'visible' : 'none')
    mapa.current.setLayoutProperty('ruas', 'visibility', base === 'ruas' ? 'visible' : 'none')
  }, [pronto, base])

  // Fixo (miniatura): sem gestos. Livre: um dedo rola a página, dois dedos movem o mapa; ao desenhar, um dedo basta.
  useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    const gestos = [m.dragPan, m.scrollZoom, m.boxZoom, m.doubleClickZoom, m.touchZoomRotate, m.keyboard, m.dragRotate, m.touchPitch]
    for (const g of gestos) { if (fixo) g.disable(); else g.enable() }
    m.dragRotate.disable()
    m.touchPitch.disable()
    m.touchZoomRotate.disableRotation()
    if (desenho || fixo) m.cooperativeGestures.disable(); else m.cooperativeGestures.enable()
  }, [pronto, fixo, desenho])

  return (
    <div className={`relative ${className ?? ''}`} style={{ minHeight: 280 }}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      {seguir && soltou && (
        <button type="button" onClick={() => { vivo.current.mexeu = false; setSoltou(false); enquadrarGuia(500) }} className="absolute bottom-9 left-2.5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-surface/95 px-3 text-sm font-semibold shadow-card ring-1 ring-line active:bg-surface-2"><Icon name="local" size={18} />Seguir meu caminho</button>
      )}
      {!fixo && (
        <div className="absolute right-2.5 top-2.5 flex flex-col gap-2">
          <div className="overflow-hidden rounded-xl bg-surface/95 shadow-card ring-1 ring-line">
            <button type="button" aria-label="Aproximar" disabled={limiteZoom.max} onClick={() => { vivo.current.mexeu = true; if (seguir) setSoltou(true); mapa.current?.zoomIn() }} className="grid size-10 place-items-center text-text hover:bg-surface-2 disabled:opacity-35"><Icon name="mais1" size={20} /></button>
            <button type="button" aria-label="Afastar" disabled={limiteZoom.min} onClick={() => { vivo.current.mexeu = true; if (seguir) setSoltou(true); mapa.current?.zoomOut() }} className="grid size-10 place-items-center border-t border-line text-text hover:bg-surface-2 disabled:opacity-35"><Icon name="menos" size={20} /></button>
          </div>
          <button type="button" aria-label={base === 'satelite' ? 'Trocar para mapa de ruas' : 'Trocar para imagem de satélite'} aria-pressed={base === 'ruas'} onClick={() => setBase(base === 'satelite' ? 'ruas' : 'satelite')} className="grid size-10 place-items-center rounded-xl bg-surface/95 text-text shadow-card ring-1 ring-line hover:bg-surface-2"><Icon name="camadas" size={20} /></button>
        </div>
      )}
    </div>
  )
}
