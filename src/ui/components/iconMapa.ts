import {
  AlignJustify, ArrowDown, ChevronLeft, Layers, Minus, Pencil, Image as Imagem, Play, Pause, Undo2, Trash2, LocateFixed, ArrowUp, Ban, Bell, BookOpen, Bug, Camera, Check, ChevronRight, Circle, CircleCheck, CircleHelp, Cloud, Download, Droplet,
  Ellipsis, Flame, Grid3x3, Grip, House, Info, Leaf, MapPin, Map as MapIcon, Moon, Plus, Search, Spline, Sprout, Stethoscope, Sun, Target, UserRound, Wifi, WifiOff, X,
  type LucideIcon,
} from 'lucide-react'

/** Conjunto único de ícones (Lucide): mesmo traço, mesma grade. Os nomes são os do domínio do app. */
export const ICONES_MAPA = {
  painel: House, mapa: MapIcon, campo: MapPin, diag: Stethoscope, alerta: Bell, mais: Ellipsis, sol: Sun, lua: Moon, camera: Camera, check: Check, x: X, mais1: Plus,
  folha: Leaf, wifi: Wifi, semwifi: WifiOff, info: Info, seta: ChevronRight, download: Download, bicho: Bug, lupa: Search, alvo: Target, nuvem: Cloud, gota: Droplet,
  fogo: Flame, cima: ArrowUp, baixo: ArrowDown, faixas: AlignJustify, circulo: Circle, grade: Grid3x3, pontos: Grip, ok: CircleCheck, duvida: CircleHelp,
  camadas: Layers, menos: Minus, voltar: ChevronLeft, lapis: Pencil, foto: Imagem, tocar: Play, pausar: Pause, desfazer: Undo2, lixo: Trash2, local: LocateFixed,
  murcha: Sprout, raiz: Spline, livro: BookOpen, perfil: UserRound, cruzar: Ban,
} as const satisfies Record<string, LucideIcon>

