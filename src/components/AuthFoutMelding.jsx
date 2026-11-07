import { useAuth } from '../context/AuthContext'

// Toont een Nederlandse melding als de terugkeer uit Auth0 mislukt is (bijv. access_denied).
export default function AuthFoutMelding() {
  const { authError } = useAuth()
  if (!authError) return null
  return (
    <div role="alert" className="bg-red-50 text-red-700 text-sm p-3 text-center">
      {authError}
    </div>
  )
}
