import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' })

  const showToast = useCallback((message, type = 'info') => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2600)
  }, [])

  return { toast, showToast }
}
