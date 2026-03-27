import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import TrainingschemaLayout from './components/TrainingschemaLayout'
import HomePage from './pages/HomePage'
import SchedulePage from './pages/SchedulePage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import PlattegrondPage from './pages/PlattegrondPage'
import VeldindelingPage from './pages/VeldindelingPage'
import HuistijlPage from './pages/HuistijlPage'
import AgendaLayout from './components/AgendaLayout'
import AgendaPage from './pages/AgendaPage'
import AgendaBeheerPage from './pages/AgendaBeheerPage'
import ProtectedRoute from './components/ProtectedRoute'
import PlaceholderPage from './pages/PlaceholderPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="trainingsschema" element={<TrainingschemaLayout />}>
          <Route index element={<SchedulePage />} />
          <Route path="veldindeling" element={<VeldindelingPage />} />
          <Route path="beheer" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="agenda" element={<AgendaLayout />}>
          <Route index element={<AgendaPage />} />
          <Route path="beheer" element={
            <ProtectedRoute>
              <AgendaBeheerPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="nieuws" element={<PlaceholderPage title="Nieuws" />} />
        <Route path="wedstrijden" element={<PlaceholderPage title="Wedstrijden" />} />
        <Route path="plattegrond" element={<PlattegrondPage />} />
        <Route path="huistijl" element={<HuistijlPage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
