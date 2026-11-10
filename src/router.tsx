import { createHashHistory, createRootRoute, createRoute, createRouter, lazyRouteComponent } from '@tanstack/react-router'
import { Shell } from './ui/Shell'
import { Painel } from './ui/pages/Painel'
import { Erro, NaoEncontrada, Carregando } from './ui/pages/Estados'

const raiz = createRootRoute({ component: Shell })
const rota = (path: string, component: ReturnType<typeof lazyRouteComponent> | (() => React.ReactNode)) =>
  createRoute({ getParentRoute: () => raiz, path, component })

// Telas pesadas são carregadas sob demanda (o Leaflet só entra em Talhões).
const arvore = raiz.addChildren([
  rota('/', Painel),
  createRoute({ getParentRoute: () => raiz, path: '/talhoes', component: lazyRouteComponent(() => import('./ui/pages/Talhoes'), 'Talhoes') }),
  createRoute({ getParentRoute: () => raiz, path: '/talhoes/novo', component: lazyRouteComponent(() => import('./ui/pages/Talhoes'), 'NovoTalhao') }),
  createRoute({ getParentRoute: () => raiz, path: '/talhoes/$id', component: lazyRouteComponent(() => import('./ui/pages/Talhoes'), 'TalhaoDetalhe') }),
  createRoute({ getParentRoute: () => raiz, path: '/coleta', component: lazyRouteComponent(() => import('./ui/pages/Campo'), 'Campo') }),
  createRoute({ getParentRoute: () => raiz, path: '/alertas', component: lazyRouteComponent(() => import('./ui/pages/Alertas'), 'Alertas') }),
  createRoute({ getParentRoute: () => raiz, path: '/diagnostico', component: lazyRouteComponent(() => import('./ui/pages/Diagnostico'), 'Diagnostico') }),
  createRoute({ getParentRoute: () => raiz, path: '/diagnostico/tecnico', component: lazyRouteComponent(() => import('./ui/pages/DiagnosticoTecnico'), 'DiagnosticoTecnico') }),
  createRoute({ getParentRoute: () => raiz, path: '/biblioteca', component: lazyRouteComponent(() => import('./ui/pages/Biblioteca'), 'Biblioteca') }),
  createRoute({ getParentRoute: () => raiz, path: '/biblioteca/$slug', component: lazyRouteComponent(() => import('./ui/pages/Biblioteca'), 'Artigo') }),
  createRoute({ getParentRoute: () => raiz, path: '/perfil', component: lazyRouteComponent(() => import('./ui/pages/Perfil'), 'Perfil') }),
  createRoute({ getParentRoute: () => raiz, path: '/estilo', component: lazyRouteComponent(() => import('./ui/pages/Estilo'), 'Estilo') }),
])

/** Hash history: funciona no GitHub Pages sem configuração de servidor. */
export const router = createRouter({
  routeTree: arvore,
  history: createHashHistory(),
  defaultPreload: 'intent',
  defaultPendingMs: 200,
  defaultPendingComponent: Carregando,
  defaultErrorComponent: Erro,
  defaultNotFoundComponent: NaoEncontrada,
})

declare module '@tanstack/react-router' {
  interface Register { router: typeof router }
}
