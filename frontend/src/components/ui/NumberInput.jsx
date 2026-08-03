import { useState, useEffect, useRef } from 'react'

/**
 * Controlled numeric input component that allows temporary empty/string state
 * while typing, and enforces minimum/maximum/fallback values on blur.
 */
export default function NumberInput({
  value,
  onChange,
  min,
  max,
  fallback = 0,
  className = 'input',
  style,
  ...props
}) {
  const [localVal, setLocalVal] = useState(() =>
    value !== undefined && value !== null ? String(value) : String(fallback)
  )
  const inputRef = useRef(null)

  useEffect(() => {
    // Only update local input text from parent prop when input is not focused
    if (document.activeElement !== inputRef.current) {
      setLocalVal(value !== undefined && value !== null ? String(value) : String(fallback))
    }
  }, [value, fallback])

  const handleChange = (e) => {
    const val = e.target.value
    setLocalVal(val)

    if (val !== '' && !isNaN(val)) {
      const num = parseInt(val, 10)
      if (!isNaN(num)) {
        let clamped = num
        if (min !== undefined && clamped < min) clamped = min
        if (max !== undefined && clamped > max) clamped = max
        onChange(clamped)
      }
    }
  }

  const handleBlur = () => {
    let num = parseInt(localVal, 10)
    if (isNaN(num)) {
      num = fallback
    } else {
      if (min !== undefined && num < min) num = min
      if (max !== undefined && num > max) num = max
    }
    setLocalVal(String(num))
    onChange(num)
  }

  return (
    <input
      ref={inputRef}
      type="number"
      min={min}
      max={max}
      className={className}
      style={style}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  )
}
