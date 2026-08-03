import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import NumberInput from './NumberInput'

describe('NumberInput', () => {
  it('renders initial numeric value as string', () => {
    const { getByRole } = render(<NumberInput value={60} onChange={() => {}} />)
    const input = getByRole('spinbutton')
    expect(input.value).toBe('60')
  })

  it('allows clearing the input mid-edit without snapping back immediately', () => {
    const handleChange = vi.fn()
    const { getByRole } = render(<NumberInput value={60} onChange={handleChange} fallback={60} />)
    const input = getByRole('spinbutton')

    // Simulate user clearing input
    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')

    // mid-edit empty string should not call onChange with NaN
    expect(handleChange).not.toHaveBeenCalledWith(NaN)
  })

  it('updates parent onChange when valid number is entered', () => {
    const handleChange = vi.fn()
    const { getByRole } = render(<NumberInput value={60} onChange={handleChange} min={1} />)
    const input = getByRole('spinbutton')

    fireEvent.change(input, { target: { value: '45' } })
    expect(input.value).toBe('45')
    expect(handleChange).toHaveBeenCalledWith(45)
  })

  it('resets to fallback value on blur if left empty', () => {
    const handleChange = vi.fn()
    const { getByRole } = render(<NumberInput value={60} onChange={handleChange} fallback={60} />)
    const input = getByRole('spinbutton')

    fireEvent.change(input, { target: { value: '' } })
    expect(input.value).toBe('')

    fireEvent.blur(input)
    expect(input.value).toBe('60')
    expect(handleChange).toHaveBeenCalledWith(60)
  })

  it('clamps value to min/max on blur', () => {
    const handleChange = vi.fn()
    const { getByRole } = render(<NumberInput value={75} onChange={handleChange} min={1} max={100} fallback={75} />)
    const input = getByRole('spinbutton')

    fireEvent.change(input, { target: { value: '150' } })
    fireEvent.blur(input)

    expect(input.value).toBe('100')
    expect(handleChange).toHaveBeenCalledWith(100)
  })
})
