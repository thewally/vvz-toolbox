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
        <Route path="vrijwilliger" element={<PlaceholderPage title="Vrijwilliger worden?" />} />
        <Route path="techniektrainingen" element={<PlaceholderPage title="Techniektrainingen" />} />
        <Route path="sponsors" element={<PlaceholderPage title="Sponsors" />} />
<Route path="lid-worden" element={<PlaceholderPage title="Lid worden?" />} />
        <Route path="wedstrijden">
          <Route index element={<PlaceholderPage title="Wedstrijden" />} />
          <Route path="programma" element={<PlaceholderPage title="Programma" />} />
          <Route path="uitslagen" element={<PlaceholderPage title="Uitslagen" />} />
          <Route path="afgelastingen" element={<PlaceholderPage title="Afgelastingen" />} />
          <Route path="verslagen" element={<PlaceholderPage title="Wedstrijdverslagen" />} />
          <Route path="topscorers" element={<PlaceholderPage title="Topscorers & Keeperstrofee" />} />
          <Route path="teams">
            <Route index element={<PlaceholderPage title="Teams" />} />
            <Route path="senioren" element={<PlaceholderPage title="Senioren" />} />
            <Route path="junioren" element={<PlaceholderPage title="Junioren" />} />
            <Route path="pupillen" element={<PlaceholderPage title="Pupillen" />} />
          </Route>
        </Route>
        <Route path="sponsoring">
          <Route path="sponsor-worden" element={<PlaceholderPage title="Sponsor worden?" />} />
          <Route path="acties" element={<PlaceholderPage title="Sponsor Acties" />} />
        </Route>
        <Route path="club">
          <Route path="historie" element={<PlaceholderPage title="Historie" />} />
          <Route path="ereleden" element={<PlaceholderPage title="Ereleden" />} />
          <Route path="reglementen" element={<PlaceholderPage title="Reglementen" />} />
        </Route>
        <Route path="lidmaatschap">
          <Route path="contributie" element={<PlaceholderPage title="Contributie" />} />
        </Route>
        <Route path="contact">
          <Route index element={<PlaceholderPage title="Contact" />} />
          <Route path="gegevens" element={<PlaceholderPage title="Contactgegevens" />} />
          <Route path="wie-doet-wat" element={<PlaceholderPage title="Wie doet wat?" />} />
          <Route path="locatie" element={<PlaceholderPage title="Locatie & Routebeschrijving" />} />
        </Route>
        <Route path="plattegrond" element={<PlattegrondPage />} />
        <Route path="huistijl" element={<HuistijlPage />} />
        <Route path="login" element={<LoginPage />} />
      </Route>
    </Routes>
  )
}
