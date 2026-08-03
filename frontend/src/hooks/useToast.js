import { useState, useCallback, useRef } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' })
  const timerRef = useRef(null)

  const showToast = useCallback((message, type = 'info', duration = 2600) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ visible: true, message, type })
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), duration)
  }, [])

  return { toast, showToast }
}
