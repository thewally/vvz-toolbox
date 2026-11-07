import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { Auth0AuthProvider } from './context/Auth0AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import AuthFoutMelding from './components/AuthFoutMelding'
import { supabaseConfigError } from './lib/supabaseClient'
import { isAuth0Mode, auth0ConfigError } from './lib/auth0Config'
import './index.css'

// Een ontbrekende build-configuratie wordt via de error boundary als duidelijke melding getoond.
function Configuratiefout({ message }) {
  const error = new Error(message)
  error.isConfigError = true
  throw error
}

function Auth0Wrapper() {
  const navigate = useNavigate()
  return (
    <Auth0AuthProvider navigate={navigate}>
      <AuthFoutMelding />
      <App />
    </Auth0AuthProvider>
  )
}

const configError = supabaseConfigError || (isAuth0Mode ? auth0ConfigError : null)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      {configError ? (
        <Configuratiefout message={configError} />
      ) : (
        <BrowserRouter basename="/vvz-toolbox">
          {isAuth0Mode ? (
            <Auth0Wrapper />
          ) : (
            <AuthProvider>
              <App />
            </AuthProvider>
          )}
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </React.StrictMode>,
)
