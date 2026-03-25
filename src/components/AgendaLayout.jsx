import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AgendaLayout() {
  const { user } = useAuth()

  return (
    <div>
      {/* Sub-navigatie */}
      <nav className="bg-white border-b border-gray-200 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-10">
          <NavLink
            to="/agenda"
            end
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-vvz-green/10 text-vvz-green'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`
            }
          >
            Agenda
          </NavLink>

          {user && (
            <NavLink
              to="/agenda/beheer"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-vvz-green/10 text-vvz-green'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`
              }
            >
              Beheer
            </NavLink>
          )}
        </div>
      </nav>

      <Outlet />
    </div>
  )
}
