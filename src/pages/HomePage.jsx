import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Welkom bij de website van VVZ'49</h2>
        <p className="text-gray-500 mt-2">Kies een tool om aan de slag te gaan</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Agenda kaartje */}
        <Link
          to="/agenda"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">Agenda</h3>
            <p className="text-sm text-gray-500 mt-1">Komende activiteiten en evenementen</p>
          </div>
        </Link>
        {/* Trainingsschema kaartje */}
        <Link
          to="/trainingsschema"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
              />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Trainingsschema
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Weekoverzicht van trainingstijden en veldindeling
            </p>
          </div>
        </Link>
        {/* Plattegrond kaartje */}
        <Link
          to="/plattegrond"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 6.75V15m6-6v8.25m.503-11.307c.204.085.412.162.624.23a48.554 48.554 0 017.373 3.465V20.25a.75.75 0 01-.997.707 48.453 48.453 0 00-7.376-3.468 48.673 48.673 0 01-7.125 3.467.75.75 0 01-.998-.706V5.748a.75.75 0 01.498-.707 48.653 48.653 0 017.125-3.467 48.483 48.483 0 017.376 3.466.75.75 0 01.498.707"
              />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Plattegrond
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Overzicht van het complex en de veldindeling
            </p>
          </div>
        </Link>
        {/* Wedstrijden kaartje */}
        <Link
          to="/wedstrijden/programma"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <img
              src={`${import.meta.env.BASE_URL}voetbal.png`}
              alt="Programma"
              className="w-16 h-16 group-hover:scale-110 transition-transform duration-200"
              style={{ filter: 'brightness(0) saturate(100%) invert(34%) sepia(100%) saturate(350%) hue-rotate(86deg) brightness(97%) contrast(87%)' }}
            />
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Programma
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Aankomende wedstrijden
            </p>
          </div>
        </Link>
        {/* Uitslagen kaartje */}
        <Link
          to="/wedstrijden/uitslagen"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Uitslagen
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Recente wedstrijdresultaten
            </p>
          </div>
        </Link>
        {/* Teams kaartje */}
        <Link
          to="/teams/senioren"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Teams
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Senioren, junioren, pupillen en veteranen
            </p>
          </div>
        </Link>
        {/* Huistijl kaartje */}
        <Link
          to="/huistijl"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Huistijl
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Logo's en officiële huistijlmiddelen
            </p>
          </div>
        </Link>
        {/* Sponsors kaartje */}
        <Link
          to="/sponsors"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <svg
              className="w-16 h-16 text-vvz-green group-hover:scale-110 transition-transform duration-200"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Sponsors
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Onze trouwe sponsors en partners
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
