import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading, pendingPasswordRecovery } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vvz-green"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Gebruiker heeft een actieve wachtwoord-reset sessie — verplicht naar reset pagina
  if (pendingPasswordRecovery) {
    return <Navigate to="/wachtwoord-resetten" replace />
  }

  // Gebruiker moet eerst een wachtwoord instellen
  if (profile !== null && profile?.password_set === false && location.pathname !== '/wachtwoord-instellen') {
    return <Navigate to="/wachtwoord-instellen" replace />
  }

  if (adminOnly && user.app_metadata?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}
