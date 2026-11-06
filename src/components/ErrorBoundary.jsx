import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[VVZ Toolbox] Onverwachte fout in de app:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md bg-white rounded-2xl shadow-md border border-gray-100 p-8 text-center">
          <h1 className="text-xl font-bold text-gray-800 mb-2">Er ging iets mis</h1>
          <p className="text-sm text-gray-600 mb-6">
            {this.state.error?.isConfigError
              ? this.state.error.message
              : 'De pagina kon niet worden getoond. Probeer de pagina te herladen.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-vvz-green text-white font-medium hover:opacity-90"
          >
            Pagina herladen
          </button>
        </div>
      </div>
    )
  }
}
