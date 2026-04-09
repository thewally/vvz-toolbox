import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, adminOnly = false, requiredRole }) {
  const { user, profile, loading, pendingPasswordRecovery, hasRole, hasAnyRole } = useAuth()
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

  // Specifieke rol vereist: check via hasRole (beheerder passeert automatisch)
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="max-w-md mx-auto p-4 pt-16 text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Geen toegang</h1>
        <p className="text-sm text-gray-500 mb-6">
          Je hebt niet de juiste rol om deze pagina te bekijken.
        </p>
        <Link
          to="/beheer"
          className="inline-block bg-vvz-green text-white px-4 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
        >
          Terug naar beheer
        </Link>
      </div>
    )
  }

  // adminOnly zonder requiredRole: legacy gedrag, alleen beheerder
  if (adminOnly && !hasAnyRole()) {
    return <Navigate to="/" replace />
  }

  return children
}
