import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { PortalProvider } from './context/PortalContext'
import { AdminProvider } from './context/AdminContext'
import './styles/globals.css'
import './styles/home.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PortalProvider>
          <AdminProvider>
            <App />
          </AdminProvider>
        </PortalProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
