import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './kit'

/** Avisa quando há versão nova ou quando o app já está pronto para uso offline. */
export function AtualizacaoPwa() {
  const { needRefresh: [novaVersao, setNova], offlineReady: [offline, setOffline], updateServiceWorker } = useRegisterSW()
  // O aviso informativo some sozinho para não cobrir os botões da tela; o de nova versão exige decisão e fica.
  useEffect(() => {
    if (!offline || novaVersao) return
    const t = setTimeout(() => setOffline(false), 6000)
    return () => clearTimeout(t)
  }, [offline, novaVersao, setOffline])
  if (!novaVersao && !offline) return null
  return (
    <div role="status" className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-card lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <p className="flex-1 text-apoio">{novaVersao ? 'Há uma nova versão do Sentinela.' : 'Pronto: o app já funciona sem internet.'}</p>
      {novaVersao ? <Button className="min-h-11" onClick={() => void updateServiceWorker(true)}>Atualizar</Button> : null}
      <Button variant="ghost" className="min-h-11" onClick={() => { setNova(false); setOffline(false) }}>Fechar</Button>
    </div>
  )
}
