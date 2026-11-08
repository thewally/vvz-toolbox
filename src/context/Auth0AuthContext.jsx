import { useEffect, useMemo, useState, useCallback } from 'react'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { AuthContext } from './AuthContext'
import { auth0Config } from '../lib/auth0Config'
import { resolveRoles, isAdminRole, safeReturnTo, mapAuth0Error } from '../lib/auth0Helpers'
import { setTokenGetter } from '../services/auth0Token'

const BASE = '/vvz-toolbox'
const redirectUri = () => `${window.location.origin}${BASE}/`

function Inner({ children }) {
  const { isLoading, isAuthenticated, user, error, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()
  const [accessRoles, setAccessRoles] = useState(null)

  const getToken = useCallback(
    () => getAccessTokenSilently({ authorizationParams: { audience: auth0Config.audience } }),
    [getAccessTokenSilently],
  )

  useEffect(() => {
    setTokenGetter(isAuthenticated ? getToken : null)
  }, [isAuthenticated, getToken])

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) {
      setAccessRoles(null)
      return undefined
    }
    ;(async () => {
      let token = null
      try {
        token = await getToken()
      } catch {
        // geen token: terugvallen op de claim in het ID-token
      }
      if (!cancelled) setAccessRoles(resolveRoles(token, user))
    })()
    return () => { cancelled = true }
  }, [isAuthenticated, user, getToken])

  const userRoles = accessRoles ?? []
  const rolesLoading = isAuthenticated && accessRoles === null

  const value = useMemo(() => {
    const isAdmin = isAdminRole(userRoles)
    return {
      user: isAuthenticated && user ? { id: user.sub, email: user.email, name: user.name } : null,
      profile: isAuthenticated && user ? { display_name: user.name || user.email, password_set: true } : null,
      loading: isLoading || rolesLoading,
      authError: error ? mapAuth0Error(error) : null,
      signIn: async (returnTo) => {
        await loginWithRedirect({ appState: { returnTo: safeReturnTo(typeof returnTo === 'string' ? returnTo : '/') } })
        return { data: null, error: null }
      },
      signOut: async () => {
        await logout({ logoutParams: { returnTo: redirectUri() } })
        return { error: null }
      },
      refreshProfile: async () => {},
      pendingPasswordRecovery: false,
      userRoles,
      isAdmin,
      hasRole: (slug) => isAdmin || userRoles.includes(slug),
      hasAnyRole: () => isAdmin || userRoles.length > 0,
    }
  }, [isAuthenticated, user, isLoading, rolesLoading, error, userRoles, loginWithRedirect, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function Auth0AuthProvider({ children, navigate }) {
  return (
    <Auth0Provider
      domain={auth0Config.domain}
      clientId={auth0Config.clientId}
      authorizationParams={{ redirect_uri: redirectUri(), ...(auth0Config.audience ? { audience: auth0Config.audience } : {}) }}
      useRefreshTokens
      cacheLocation="localstorage"
      onRedirectCallback={(appState) => navigate(safeReturnTo(appState?.returnTo), { replace: true })}
    >
      <Inner>{children}</Inner>
    </Auth0Provider>
  )
}
