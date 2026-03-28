import { NavLink, Outlet } from 'react-router-dom'

export default function WedstrijdenLayout() {
  return (
    <div>
      {/* Sub-navigatie */}
      <nav className="bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-10">
          <NavLink
            to="/wedstrijden/programma"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-vvz-green/10 text-vvz-green'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
          >
            Programma
          </NavLink>

          <NavLink
            to="/wedstrijden/uitslagen"
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-vvz-green/10 text-vvz-green'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
          >
            Uitslagen
          </NavLink>

        </div>
      </nav>

      <Outlet />
    </div>
  )
}
