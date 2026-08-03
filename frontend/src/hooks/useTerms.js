import { useState, useEffect, useCallback } from 'react'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000')

export function useTerms(user) {
  const [terms, setTerms] = useState([])
  const [loadingTerms, setLoadingTerms] = useState(false)

  const fetchTerms = useCallback(async () => {
    if (!user?.authToken) return
    setLoadingTerms(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/terms`, {
        headers: { Authorization: `Bearer ${user.authToken}` },
      })
      if (res.ok) {
        const list = await res.json()
        setTerms(list)
      }
    } catch (err) {
      console.error('Failed to fetch terms:', err)
    } finally {
      setLoadingTerms(false)
    }
  }, [user])

  useEffect(() => {
    fetchTerms()
  }, [fetchTerms])

  const createTerm = async ({ name, startDate, endDate, isCurrent }) => {
    if (!user?.authToken) return null
    try {
      const res = await fetch(`${API_BASE_URL}/api/terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify({ name, startDate, endDate, isCurrent }),
      })
      if (res.ok) {
        const created = await res.json()
        await fetchTerms()
        return created
      }
    } catch (err) {
      console.error('Failed to create term:', err)
    }
    return null
  }

  const updateTerm = async (id, updates) => {
    if (!user?.authToken) return null
    try {
      const res = await fetch(`${API_BASE_URL}/api/terms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        await fetchTerms()
        return updated
      }
    } catch (err) {
      console.error('Failed to update term:', err)
    }
    return null
  }

  const deleteTerm = async (id) => {
    if (!user?.authToken) return false
    try {
      const res = await fetch(`${API_BASE_URL}/api/terms/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user.authToken}` },
      })
      if (res.ok) {
        await fetchTerms()
        return true
      }
    } catch (err) {
      console.error('Failed to delete term:', err)
    }
    return false
  }

  const currentTerm = terms.find(t => t.isCurrent) || terms[0] || null

  return { terms, currentTerm, loadingTerms, createTerm, updateTerm, deleteTerm, refreshTerms: fetchTerms }
}
