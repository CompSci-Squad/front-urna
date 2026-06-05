import { Buffer } from 'buffer'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '../tokens.css'
import { registerSW } from 'virtual:pwa-register'

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer
}

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
}

if (import.meta.env.PROD) {
  registerSW({
    onOfflineReady() {
      console.log('App ready for offline use')
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
