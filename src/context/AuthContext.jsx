import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fetchProfile } from '../services/profiles'
import { getMyRoles } from '../services/roles'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingPasswordRecovery, setPendingPasswordRecovery] = useState(false)
  const [userRoles, setUserRoles] = useState([])

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await fetchProfile(userId)
    if (!error && data) {
      setProfile(data)
    } else {
      // Profiel bestaat mogelijk nog niet (bijv. bestaande admin-accounts)
      setProfile(null)
    }
  }

  async function loadRoles() {
    const { data } = await getMyRoles()
    setUserRoles(data ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Promise.all([loadProfile(u.id), loadRoles()]).then(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (event === 'PASSWORD_RECOVERY') {
        setPendingPasswordRecovery(true)
      } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        setPendingPasswordRecovery(false)
      }
      if (u) {
        loadProfile(u.id)
        loadRoles()
      } else {
        setProfile(null)
        setUserRoles([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }


  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }

  const isAdmin = user?.app_metadata?.role === 'admin'
  const hasRole = (slug) => isAdmin || userRoles.includes(slug)
  const hasAnyRole = () => isAdmin || userRoles.length > 0

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, pendingPasswordRecovery, userRoles, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
