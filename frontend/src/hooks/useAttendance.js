import { useState, useEffect, useRef, useCallback } from 'react'
import { DEFAULT_DATA } from '../constants'

const LS_KEY = 'markd_v1'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5000')

async function getAuthHeaders(user) {
  return user?.authToken
    ? { Authorization: `Bearer ${user.authToken}` }
    : {}
}

export function useAttendance(user) {
  const [data,        setData]        = useState(DEFAULT_DATA)
  const [syncStatus,  setSyncStatus]  = useState('synced') // 'synced' | 'syncing' | 'error'
  const [dataLoading, setDataLoading] = useState(true)
  // Toast callback injected from App — set via setToastFn after mount
  const toastFnRef = useRef(null)

  const isFirstLoad = useRef(true)
  const saveTimer   = useRef(null)
  // Tracks the last known server version of the config blob for optimistic
  // concurrency. Starts at 0; updated whenever we successfully load or save.
  const serverVersion = useRef(0)

  // ── Allow App to inject the showToast function ────────────────────────────
  // useAttendance is instantiated before Toast is available, so we inject
  // showToast via a ref callback rather than a prop.
  const setToastFn = useCallback((fn) => {
    toastFnRef.current = fn
  }, [])

  const showToast = useCallback((msg, type = 'info') => {
    if (toastFnRef.current) toastFnRef.current(msg, type)
  }, [])

  // ── Load from backend when user logs in ──────────────────────────────────
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
          // Capture server version for optimistic concurrency
          serverVersion.current = remote._version ?? 0

          setData({
            subjects:             remote.subjects              || [],
            timetable:            remote.timetable             || DEFAULT_DATA.timetable,
            attendance:           remote.attendance            || {},
            dailyLog:             remote.dailyLog              || remote.daily_log || {},
            historicalAttendance: remote.historicalAttendance  || remote.historical_attendance || {},
            phase:                remote.phase                 || 'setup',
            lectureSettings:      remote.lectureSettings       || remote.lecture_settings || DEFAULT_DATA.lectureSettings,
          })
        } else {
          // First-time user — use defaults; version stays at 0
          setData(DEFAULT_DATA)
        }
        setSyncStatus('synced')
      } catch (err) {
        console.error(err)
        setSyncStatus('error')
        // Fallback to localStorage if the API is unreachable
        const local = localStorage.getItem(LS_KEY)
        if (local) setData(JSON.parse(local))
      } finally {
        setDataLoading(false)
        isFirstLoad.current = false
      }
    }
    load()
  }, [user])

  // ── Debounced cloud save whenever data changes ────────────────────────────
  useEffect(() => {
    if (isFirstLoad.current || !user) return

    // Always update localStorage immediately for offline resilience
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
          // Include _version so the server can detect concurrent saves
          body: JSON.stringify({ data: { ...data, _version: serverVersion.current } }),
        })

        if (res.status === 409) {
          // Optimistic concurrency conflict: another tab saved in the meantime.
          // Don't overwrite — instead reload fresh data from the server.
          setSyncStatus('error')
          showToast(
            '⚠️ Conflict: another tab modified your data. Reloading…',
            'error'
          )
          // Re-fetch fresh data and update local state + version
          const freshRes = await fetch(`${API_BASE_URL}/api/data`, {
            headers: await getAuthHeaders(user),
          })
          if (freshRes.ok) {
            const fresh = await freshRes.json()
            serverVersion.current = fresh._version ?? 0
            setData({
              subjects:             fresh.subjects              || [],
              timetable:            fresh.timetable             || DEFAULT_DATA.timetable,
              attendance:           fresh.attendance            || {},
              dailyLog:             fresh.dailyLog              || {},
              historicalAttendance: fresh.historicalAttendance  || {},
              phase:                fresh.phase                 || 'setup',
              lectureSettings:      fresh.lectureSettings       || DEFAULT_DATA.lectureSettings,
            })
            setSyncStatus('synced')
          }
          return
        }

        if (!res.ok) throw new Error('Failed to sync')

        // Successful save: increment local version mirror to stay in sync
        // (server increments version on each POST)
        serverVersion.current += 1
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }, 1000)

    return () => clearTimeout(saveTimer.current)
  }, [data, user]) // eslint-disable-line

  // ── Hard reset ────────────────────────────────────────────────────────────
  const resetData = async () => {
    try {
      if (user) {
        await fetch(`${API_BASE_URL}/api/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders(user)),
          },
          // Pass current version to avoid a spurious conflict on reset
          body: JSON.stringify({ data: { ...DEFAULT_DATA, _version: serverVersion.current } }),
        })
        serverVersion.current = 0
      }
      localStorage.removeItem(LS_KEY)
      setData(DEFAULT_DATA)
      isFirstLoad.current = false
    } catch {
      setSyncStatus('error')
    }
  }

  return { data, setData, syncStatus, dataLoading, resetData, setToastFn }
}
