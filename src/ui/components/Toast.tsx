import { useToast } from '../state/toast'

export function Toast() {
  const { msg, tom } = useToast()
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
      {msg && <div className={`rounded-full px-5 py-3 text-sm font-semibold shadow-card ${tom === 'ok' ? 'bg-brand text-on-brand' : 'bg-danger text-on-brand'}`}>{msg}</div>}
    </div>
  )
}
