import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-800">Welkom bij de VVZ'49 Toolbox</h2>
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
        {/* Wedstrijden kaartje */}
        <Link
          to="/wedstrijden"
          className="group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-1 border border-gray-100 overflow-hidden"
        >
          <div className="bg-vvz-green/10 p-6 flex items-center justify-center">
            <img
              src={`${import.meta.env.BASE_URL}voetbal.png`}
              alt=""
              className="w-16 h-16 group-hover:scale-110 transition-transform duration-200"
              style={{ filter: 'invert(27%) sepia(51%) saturate(400%) hue-rotate(90deg) brightness(85%) contrast(95%)' }}
            />
          </div>
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-800 group-hover:text-vvz-green transition-colors">
              Wedstrijden
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Wedstrijdprogramma, uitslagen en teampagina's
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
      </div>
    </div>
  )
}
