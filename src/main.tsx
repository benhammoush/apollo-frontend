import './utils/queryTracker'
import './design-system/styles.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { SystemStatusProvider } from './contexts/ViewerSystemStatusContext'
import { PersistedProvider } from './store/PersistedContext'
import { PersistenceManager } from './store/persistence'
import { applyThemeMode } from './design-system'
applyThemeMode(PersistenceManager.load().uiThemeMode)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SystemStatusProvider>
      <BrowserRouter>
        <PersistedProvider>
          <App />
        </PersistedProvider>
      </BrowserRouter>
    </SystemStatusProvider>
  </React.StrictMode>
)
