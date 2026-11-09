import maplibregl, { type GeoJSONSource, type Map as MLMap, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Feature, FeatureCollection, GeoJsonProperties, Geometry } from 'geojson'
import { useEffect, useRef, useState } from 'react'
import type { Talhao } from '@/domain/entidades'
import type { LngLat } from '@/domain/geo'
import type { PlanPoint } from '@/domain/sampling'
import type { CelulaCalor } from '@/domain/resultados'
import { COR_ESTADO, type MarcadorPonto } from './estadoPonto'

type Base = 'satelite' | 'ruas'

const ESTILO: StyleSpecification = {
  version: 8,
  sources: {
    satelite: {
      type: 'raster', tileSize: 256, maxzoom: 18,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      attribution: 'Imagens © Esri, Maxar, Earthstar Geographics',
    },
    ruas: {
      type: 'raster', tileSize: 256, maxzoom: 19,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'satelite', type: 'raster', source: 'satelite' },
    { id: 'ruas', type: 'raster', source: 'ruas', layout: { visibility: 'none' } },
  ],
}

const pos = (p: LngLat): [number, number] => [p[0], p[1]]
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
  /** Mapa fixo no talhão (sem arrastar nem dar zoom). Padrão: fixo sempre que há um talhão enquadrado e não se está desenhando. */
  travar?: boolean
  className?: string
}

/** Base única de mapa (MapLibre) com o talhão sempre ao fundo. */
export function Mapa({ talhoes, selecionadoId, onSelecionar, pontos = [], marcadores, pontoSelecionado = null, pontoProximo = null, onPonto, calor = null, caminho = [], desenho = null, onVertice, enquadrar, travar, className }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapa = useRef<MLMap | null>(null)
  const [pronto, setPronto] = useState(false)
  const [base, setBase] = useState<Base>('satelite')
  const fixo = travar ?? (!desenho && !!enquadrar && enquadrar.length > 0)
  const zoomCtl = useRef<maplibregl.NavigationControl | null>(null)
  // Os handlers do mapa são registrados uma vez; os valores atuais vêm por ref.
  const vivo = useRef({ desenho, onVertice, onSelecionar, onPonto })
  useEffect(() => { vivo.current = { desenho, onVertice, onSelecionar, onPonto } })

  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({ container: el.current, style: ESTILO, center: [-55.805, -13.255], zoom: 14, maxZoom: 20, attributionControl: { compact: true } })
    mapa.current = m
    zoomCtl.current = new maplibregl.NavigationControl({ showCompass: false })
    m.on('load', () => {
      for (const id of ['talhoes', 'calor', 'caminho', 'desenho-linha', 'desenho-vertices']) m.addSource(id, { type: 'geojson', data: vazio() })
      m.addLayer({ id: 'talhoes-fill', type: 'fill', source: 'talhoes', paint: { 'fill-color': ['case', ['get', 'sel'], '#5ee19a', '#7cc7ff'], 'fill-opacity': ['case', ['get', 'sel'], 0.18, 0.08] } })
      m.addLayer({ id: 'calor', type: 'fill', source: 'calor', paint: { 'fill-antialias': false, 'fill-opacity': 0.62, 'fill-color': ['interpolate', ['linear'], ['get', 't'], 0, '#fff3b0', 0.5, '#f59f3a', 1, '#c0391f'] } })
      m.addLayer({ id: 'talhoes-line', type: 'line', source: 'talhoes', paint: { 'line-color': ['case', ['get', 'sel'], '#5ee19a', '#7cc7ff'], 'line-width': ['case', ['get', 'sel'], 3, 2] } })
      m.addLayer({ id: 'caminho', type: 'line', source: 'caminho', paint: { 'line-color': '#ffd666', 'line-width': 2, 'line-dasharray': [3, 3] } })
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
    const ro = new ResizeObserver(() => m.resize())
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
    mapa.current?.fitBounds(b, { padding: 28, maxZoom: 17, duration: 400 })
  }, [pronto, enquadrar])

  useEffect(() => {
    if (!pronto || !mapa.current) return
    mapa.current.setLayoutProperty('satelite', 'visibility', base === 'satelite' ? 'visible' : 'none')
    mapa.current.setLayoutProperty('ruas', 'visibility', base === 'ruas' ? 'visible' : 'none')
  }, [pronto, base])

  // Fixo no talhão: sem arrastar, sem zoom, sem girar. Os pontos continuam clicáveis e a página rola normalmente por cima do mapa.
  useEffect(() => {
    const m = mapa.current
    if (!pronto || !m) return
    const gestos = [m.dragPan, m.scrollZoom, m.boxZoom, m.doubleClickZoom, m.touchZoomRotate, m.keyboard, m.dragRotate, m.touchPitch]
    for (const g of gestos) { if (fixo) g.disable(); else g.enable() }
    const ctl = zoomCtl.current
    if (ctl) {
      if (fixo && m.hasControl(ctl)) m.removeControl(ctl)
      if (!fixo && !m.hasControl(ctl)) m.addControl(ctl, 'top-left')
    }
  }, [pronto, fixo])

  return (
    <div className={`relative ${className ?? ''}`} style={{ minHeight: 280 }}>
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
      <div role="group" aria-label="Fundo do mapa" className="absolute right-2 top-2 flex overflow-hidden rounded-xl border border-line bg-surface/95 text-sm font-semibold shadow">
        {(['satelite', 'ruas'] as const).map((b) => (
          <button key={b} type="button" aria-pressed={base === b} onClick={() => setBase(b)} className={`min-h-10 px-3 ${base === b ? 'bg-brand text-on-brand' : 'text-text-2 hover:bg-surface-2'}`}>
            {b === 'satelite' ? 'Satélite' : 'Ruas'}
          </button>
        ))}
      </div>
    </div>
  )
}
