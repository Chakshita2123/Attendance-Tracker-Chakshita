import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useToast } from './useToast'

describe('useToast', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initial state: toast is not visible', () => {
    const { result } = renderHook(() => useToast())
    expect(result.current.toast.visible).toBe(false)
    expect(result.current.toast.message).toBe('')
    expect(result.current.toast.type).toBe('info')
  })

  it('showToast makes toast visible with message and type', () => {
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('Saved!', 'success')
    })
    expect(result.current.toast.visible).toBe(true)
    expect(result.current.toast.message).toBe('Saved!')
    expect(result.current.toast.type).toBe('success')
  })

  it('toast auto-hides after 2600ms', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useToast())
    act(() => {
      result.current.showToast('Test', 'info')
    })
    expect(result.current.toast.visible).toBe(true)

    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(result.current.toast.visible).toBe(false)
    vi.useRealTimers()
  })
})
