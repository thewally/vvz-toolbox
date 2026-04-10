export default function LidWordenPage() {
  return (
    <div className="max-w-2xl mx-auto p-4 pt-10 text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Lid worden?</h1>
      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
        Wil jij ook voetballen bij VVZ'49? Meld je aan via het aanmeldformulier van de KNVB.
        Het invullen duurt maar een paar minuten!
      </p>

      <a
        href="https://www.knvb.nl/ontdek-voetbal/inschrijven/BBCC89Q"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 bg-vvz-green text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-vvz-green-dark transition-colors shadow-md"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
        Aanmelden via KNVB
      </a>

      <p className="text-sm text-gray-400 mt-4">
        Je wordt doorgestuurd naar de website van de KNVB.
      </p>
    </div>
  )
}
