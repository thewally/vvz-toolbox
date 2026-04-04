import { Link } from 'react-router-dom'

export default function EmailBevestigdPage() {
  return (
    <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded-xl shadow-lg text-center">
      <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Je account is bevestigd!</h2>
      <p className="text-gray-600 mb-6">Je kunt nu inloggen met je e-mailadres en wachtwoord.</p>
      <Link
        to="/login"
        className="inline-block bg-vvz-green text-white px-6 py-2 rounded-lg font-medium hover:bg-vvz-green-dark transition-colors"
      >
        Naar inloggen
      </Link>
    </div>
  )
}
