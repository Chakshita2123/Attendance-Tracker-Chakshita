import { useState, useEffect, useRef } from 'react'
import { DEFAULT_DATA } from '../constants'

const LS_KEY = 'markd_v1'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'

async function getAuthHeaders(user) {
  if (!user?.getAuthJson) return {}
  const { accessToken } = await user.getAuthJson()

  return accessToken
    ? { 'x-stack-access-token': accessToken }
    : {}
}

export function useAttendance(user) {
  const [data,       setData]       = useState(DEFAULT_DATA)
  const [syncStatus, setSyncStatus] = useState('synced') // 'synced' | 'syncing' | 'error'
  const [dataLoading, setDataLoading] = useState(true)

  const isFirstLoad = useRef(true)
  const saveTimer   = useRef(null)

  // ── Load from Local Backend when user logs in ──
  useEffect(() => {
    if (!user) { setDataLoading(false); return }

    const load = async () => {
      setDataLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/data`, {
          headers: await getAuthHeaders(user),
        })
        if (!res.ok) throw new Error('Failed to load data')
        
        const remote = await res.json()

        if (remote) {
          setData({
            subjects:        remote.subjects         || [],
            timetable:       remote.timetable        || DEFAULT_DATA.timetable,
            attendance:      remote.attendance       || {},
            dailyLog:        remote.dailyLog         || remote.daily_log || {},
            phase:           remote.phase            || 'setup',
            lectureSettings: remote.lectureSettings  || remote.lecture_settings || DEFAULT_DATA.lectureSettings,
          })
        } else {
          // First time user — just use default data
          // An initial POST isn't strictly necessary since saving triggers on edit
          setData(DEFAULT_DATA)
        }
        setSyncStatus('synced')
      } catch (err) {
        console.error(err)
        setSyncStatus('error')
        const local = localStorage.getItem(LS_KEY)
        if (local) setData(JSON.parse(local))
      } finally {
        setDataLoading(false)
        isFirstLoad.current = false
      }
    }
    load()
  }, [user])

  // ── Debounced cloud save whenever data changes ──
  useEffect(() => {
    if (isFirstLoad.current || !user) return
    localStorage.setItem(LS_KEY, JSON.stringify(data))
    setSyncStatus('syncing')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders(user)),
          },
          body: JSON.stringify({ data }),
        })
        if (!res.ok) throw new Error('Failed to sync')
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 1000)
    return () => clearTimeout(saveTimer.current)
  }, [data, user]) // eslint-disable-line

  // ── Hard reset ──
  const resetData = async () => {
    try {
      if (user) {
        // We do not have a hard reset DELETE endpoint yet,
        // but we can overwrite the data with empty defaults.
        await fetch(`${API_BASE_URL}/api/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders(user)),
          },
          body: JSON.stringify({ data: DEFAULT_DATA }),
        })
      }
      localStorage.removeItem(LS_KEY)
      setData(DEFAULT_DATA)
      isFirstLoad.current = false
    } catch {
      setSyncStatus('error')
    }
  }

  return { data, setData, syncStatus, dataLoading, resetData }
}
