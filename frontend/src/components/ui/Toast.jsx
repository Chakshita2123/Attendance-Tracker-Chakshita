import { CheckCircle, AlertCircle, Info } from 'lucide-react'

export default function Toast({ toast }) {
  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info
  return (
    <div className={`toast ${toast.visible ? 'visible' : ''} ${toast.type}`} role="status">
      <Icon size={15} />
      {toast.message}
    </div>
  )
}
