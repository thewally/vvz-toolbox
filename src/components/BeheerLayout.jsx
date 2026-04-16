import { Outlet } from 'react-router-dom'

/**
 * BeheerLayout is bewust een lichte wrapper: de feitelijke navigatie naar
 * alle beheerschermen (inclusief "Wedstrijdverslagen") loopt via de tiles
 * op /beheer (BeheerDashboardPage). Elke pagina biedt zelf een
 * "← Terug naar Beheer" link.
 */
export default function BeheerLayout() {
  return <Outlet />
}
