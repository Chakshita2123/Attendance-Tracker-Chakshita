// CSS imported here, BEFORE the app renders, so styles are
// applied synchronously on first paint — no jitter, no FOUC.
import './styles/globals.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { getApiBaseUrl } from './utils/api'

console.log('🚀 [App Startup] Resolved API Base URL:', getApiBaseUrl())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

