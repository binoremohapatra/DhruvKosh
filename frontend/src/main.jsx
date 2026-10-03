import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './config/firebase.js' // Initialize Firebase + Analytics on startup
import App from './App.jsx'
import { BandwidthProvider } from './context/BandwidthContext.jsx'
import { DownloadProvider } from './context/DownloadContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BandwidthProvider>
      <DownloadProvider>
        <App />
      </DownloadProvider>
    </BandwidthProvider>
  </StrictMode>,
)

