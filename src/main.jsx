import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { supabaseConfigError } from './lib/supabaseClient'
import './index.css'

// Een ontbrekende build-configuratie wordt via de error boundary als duidelijke melding getoond.
function Configuratiefout({ message }) {
  const error = new Error(message)
  error.isConfigError = true
  throw error
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {supabaseConfigError ? (
        <Configuratiefout message={supabaseConfigError} />
      ) : (
        <BrowserRouter basename="/vvz-toolbox">
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)
