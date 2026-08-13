import { useState, useEffect, useRef, useCallback } from 'react'
import { DEFAULT_DATA } from '../constants'
import { getApiBaseUrl } from '../utils/api'

const LS_KEY = 'markd_v1'
const getBaseUrl = () => getApiBaseUrl()

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

  // Serialization & pending save refs to prevent in-flight request races
  const isSavingRef = useRef(false)
  const hasPendingSaveRef = useRef(false)
  const latestDataRef = useRef(data)
  latestDataRef.current = data

  // ── Allow App to inject the showToast function ────────────────────────────
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
        const res = await fetch(`${getBaseUrl()}/api/data`, {
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
            manualStats:          remote.manualStats           || {},
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

  // ── Serialized save function ───────────────────────────────────────────────
  const performSave = useCallback(async () => {
    if (!user) return

    // If a save is already in-flight, mark pending and return.
    // The active save's finally block will execute the pending save once it finishes.
    if (isSavingRef.current) {
      hasPendingSaveRef.current = true
      return
    }

    isSavingRef.current = true
    hasPendingSaveRef.current = false
    setSyncStatus('syncing')

    try {
      const payloadData = latestDataRef.current
      const sendingVersion = serverVersion.current

      const res = await fetch(`${getBaseUrl()}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders(user)),
        },
        // Include _version so the server can detect concurrent saves
        body: JSON.stringify({ data: { ...payloadData, _version: sendingVersion } }),
      })

      if (res.status === 409) {
        // Genuine Optimistic concurrency conflict: another tab modified data.
        setSyncStatus('error')
        showToast(
          '⚠️ Conflict: another tab modified your data. Reloading…',
          'error'
        )
        // Re-fetch fresh data and update local state + version
        const freshRes = await fetch(`${getBaseUrl()}/api/data`, {
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
            manualStats:          fresh.manualStats           || {},
            phase:                fresh.phase                 || 'setup',
            lectureSettings:      fresh.lectureSettings       || DEFAULT_DATA.lectureSettings,
          })
          setSyncStatus('synced')
        }
        return
      }

      if (!res.ok) throw new Error('Failed to sync')

      const resJson = await res.json()
      // Use authoritative server version from response
      if (resJson.version !== undefined && resJson.version !== null) {
        serverVersion.current = resJson.version
      } else {
        serverVersion.current += 1
      }
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
    } finally {
      isSavingRef.current = false

      // If changes occurred while save was in-flight, schedule follow-up save after 300ms safety gap
      if (hasPendingSaveRef.current) {
        hasPendingSaveRef.current = false
        clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => {
          performSave()
        }, 300)
      }
    }
  }, [user, showToast])

  // ── Debounced cloud save whenever data changes ────────────────────────────
  useEffect(() => {
    if (isFirstLoad.current || !user) return

    // Always update localStorage immediately for offline resilience
    localStorage.setItem(LS_KEY, JSON.stringify(data))

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      performSave()
    }, 1000)

    return () => clearTimeout(saveTimer.current)
  }, [data, user, performSave])

  // ── Hard reset ────────────────────────────────────────────────────────────
  const resetData = async () => {
    try {
      if (user) {
        await fetch(`${getBaseUrl()}/api/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeaders(user)),
          },
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
