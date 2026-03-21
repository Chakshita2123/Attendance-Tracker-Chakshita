import { useState, useEffect } from 'react'

export function useAuth() {
  // Bypassing authentication: Hardcode a default user with ID 1
  // (ID 1 works perfectly with your SQLite UserData table schema)
  const [user, setUser] = useState({ 
    id: 1, 
    name: 'Local Developer', 
    email: 'dev@local.com', 
    role: 'student' 
  })
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [signUpDone, setSignUpDone] = useState(false)

  useEffect(() => {
    // Keep the loading state false immediately to skip the loading screen
    setLoading(false)
  }, [])

  // Stub out the auth functions so the UI doesn't break if buttons are clicked
  const signIn = async () => {}
  const signUp = async () => {}
  const signInWithGoogle = async () => {}
  const signOut = async () => {
    // Optionally allow "logout" to reset back to null if they really want,
    // but usually in a bypassed state, we just do nothing.
    alert("Auth is currently bypassed! You are always signed in.")
  }

  return {
    user, loading, authError, setAuthError,
    signUpDone, setSignUpDone,
    signIn, signUp, signInWithGoogle, signOut,
  }
}