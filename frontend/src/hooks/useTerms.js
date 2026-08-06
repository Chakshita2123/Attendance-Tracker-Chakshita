import { useState, useEffect, useCallback } from 'react'
import { getApiBaseUrl } from '../utils/api'

const getBaseUrl = () => getApiBaseUrl()



export function useTerms(user) {
  const [terms, setTerms] = useState([])
  const [loadingTerms, setLoadingTerms] = useState(false)

  const fetchTerms = useCallback(async () => {
    if (!user?.authToken) return
    setLoadingTerms(true)
    try {
      const res = await fetch(`${getBaseUrl()}/api/terms`, {
        headers: { Authorization: `Bearer ${user.authToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTerms(data)
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

  const createTerm = async (termData) => {
    if (!user?.authToken) return null
    try {
      const res = await fetch(`${getBaseUrl()}/api/terms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify(termData),
      })
      if (!res.ok) throw new Error('Failed to create term')
      const newTerm = await res.json()
      setTerms((prev) => [newTerm, ...prev])
      return newTerm
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const updateTerm = async (id, termData) => {
    if (!user?.authToken) return null
    try {
      const res = await fetch(`${getBaseUrl()}/api/terms/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify(termData),
      })
      if (!res.ok) throw new Error('Failed to update term')
      const updated = await res.json()
      setTerms((prev) => prev.map((t) => (t._id === id ? updated : t)))
      return updated
    } catch (err) {
      console.error(err)
      throw err
    }
  }

  const deleteTerm = async (id) => {
    if (!user?.authToken) return
    try {
      const res = await fetch(`${getBaseUrl()}/api/terms/${id}`, {
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
