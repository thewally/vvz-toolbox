import { useAuth } from '../context/AuthContext'

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const MicrosoftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 21 21">
    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const XIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const PROVIDERS = [
  {
    key: 'google',
    label: 'Google',
    icon: GoogleIcon,
    className: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    key: 'azure',
    label: 'Microsoft',
    icon: MicrosoftIcon,
    className: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: FacebookIcon,
    className: 'bg-[#1877F2] text-white hover:bg-[#166FE5]',
  },
  {
    key: 'twitter',
    label: 'X',
    icon: XIcon,
    className: 'bg-black text-white hover:bg-gray-900',
  },
]

/**
 * OAuth-knoppen voor login en registratie.
 * @param {'login' | 'register'} mode - Bepaalt de knoptekst
 */
export default function OAuthButtons({ mode = 'login' }) {
  const { signInWithProvider } = useAuth()
  const prefix = mode === 'register' ? 'Registreren met' : 'Doorgaan met'

  return (
    <div className="space-y-2">
      {PROVIDERS.map(({ key, label, icon: Icon, className }) => (
        <button
          key={key}
          type="button"
          onClick={() => signInWithProvider(key)}
          className={`w-full py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-3 transition-colors ${className}`}
        >
          <Icon />
          {prefix} {label}
        </button>
      ))}
    </div>
  )
}
