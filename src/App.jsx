import { Navigate, Routes, Route } from 'react-router-dom'
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
import ActiviteitenPage from './pages/ActiviteitenPage'
import ActiviteitenBeheerPage from './pages/ActiviteitenBeheerPage'
import BeheerLayout from './components/BeheerLayout'
import BeheerDashboardPage from './pages/BeheerDashboardPage'
import WedstrijdenLayout from './components/WedstrijdenLayout'
import WedstrijdenProgrammaPage from './pages/WedstrijdenProgrammaPage'
import WedstrijdenUitslagenPage from './pages/WedstrijdenUitslagenPage'
import WedstrijdenTeamsCatPage from './pages/WedstrijdenTeamsCatPage'
import WedstrijdenTeamsZaalPage from './pages/WedstrijdenTeamsZaalPage'
import WedstrijdenAfgelastingenPage from './pages/WedstrijdenAfgelastingenPage'
import WedstrijdenStandenPage from './pages/WedstrijdenStandenPage'
import TeamPage from './pages/TeamPage'
import TrainingschemaBeheerPage from './pages/TrainingschemaBeheerPage'
import ProtectedRoute from './components/ProtectedRoute'
import PlaceholderPage from './pages/PlaceholderPage'
import ContactgegevensPage from './pages/ContactgegevensPage'
import ReglemenenPage from './pages/ReglemenenPage'
import LocatieRoutebeschrijvingPage from './pages/LocatieRoutebeschrijvingPage'
import SponsorsPage from './pages/SponsorsPage'
import SponsorDetailPage from './pages/SponsorDetailPage'
import SponsorWordenPage from './pages/SponsorWordenPage'
import SponsoringBeheerPage from './pages/SponsoringBeheerPage'
import WieDoetWatPage from './pages/WieDoetWatPage'
import ContactBeheerPage from './pages/ContactBeheerPage'
import WieDoetWatBeheerPage from './pages/WieDoetWatBeheerPage'
import EreledenPage from './pages/EreledenPage'
import EreledenBeheerPage from './pages/EreledenBeheerPage'
import MenuBeheerPage from './pages/MenuBeheerPage'
import ContentPage from './pages/ContentPage'
import ContentBeheerPage from './pages/ContentBeheerPage'
import ContentEditPage from './pages/ContentEditPage'
import NieuwsPage from './pages/NieuwsPage'
import NieuwsDetailPage from './pages/NieuwsDetailPage'
import NieuwsBeheerPage from './pages/NieuwsBeheerPage'
import NieuwsEditPage from './pages/NieuwsEditPage'
import EmailBevestigdPage from './pages/EmailBevestigdPage'
import GebruikersBeheerPage from './pages/GebruikersBeheerPage'
import WachtwoordVergetenPage from './pages/WachtwoordVergetenPage'
import WachtwoordResettenPage from './pages/WachtwoordResettenPage'
import WachtwoordInstellenPage from './pages/WachtwoordInstellenPage'
import VrijwilligerWordenPage from './pages/VrijwilligerWordenPage'
import LidWordenPage from './pages/LidWordenPage'
import VrijwilligersBeheerPage from './pages/VrijwilligersBeheerPage'
import LidWordenBeheerPage from './pages/LidWordenBeheerPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="trainingsschema" element={<TrainingschemaLayout />}>
          <Route index element={<SchedulePage isAdmin={false} />} />
          <Route path="veldindeling" element={<VeldindelingPage />} />
          <Route path="beheer" element={<Navigate to="/beheer/trainingsschema/instellingen" replace />} />
        </Route>
        <Route path="agenda" element={<Navigate to="/activiteiten" replace />} />
        <Route path="agenda/beheer" element={<Navigate to="/beheer/activiteiten" replace />} />
        <Route path="activiteiten" element={<AgendaLayout />}>
          <Route index element={<ActiviteitenPage />} />
        </Route>
        <Route path="beheer" element={
          <ProtectedRoute adminOnly>
            <BeheerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<BeheerDashboardPage />} />
          <Route path="activiteiten" element={<ProtectedRoute requiredRole="activiteiten"><ActiviteitenBeheerPage /></ProtectedRoute>} />
          <Route path="trainingsschema" element={<ProtectedRoute requiredRole="trainingsschema"><TrainingschemaLayout /></ProtectedRoute>}>
            <Route path=":scheduleId" element={<TrainingschemaBeheerPage />} />
            <Route path="instellingen" element={<AdminPage />} />
          </Route>
          <Route path="sponsoring" element={<ProtectedRoute requiredRole="sponsoring"><SponsoringBeheerPage /></ProtectedRoute>} />
          <Route path="club">
            <Route path="ereleden" element={<ProtectedRoute requiredRole="ereleden"><EreledenBeheerPage /></ProtectedRoute>} />
          </Route>
          <Route path="gebruikers" element={<ProtectedRoute requiredRole="gebruikers"><GebruikersBeheerPage /></ProtectedRoute>} />
          <Route path="menu" element={<ProtectedRoute requiredRole="content"><MenuBeheerPage /></ProtectedRoute>} />
          <Route path="nieuws" element={<ProtectedRoute requiredRole="content"><NieuwsBeheerPage /></ProtectedRoute>} />
          <Route path="nieuws/nieuw" element={<ProtectedRoute requiredRole="content"><NieuwsEditPage /></ProtectedRoute>} />
          <Route path="nieuws/:id" element={<ProtectedRoute requiredRole="content"><NieuwsEditPage /></ProtectedRoute>} />
          <Route path="content" element={<ProtectedRoute requiredRole="content"><ContentBeheerPage /></ProtectedRoute>} />
          <Route path="content/nieuw" element={<ProtectedRoute requiredRole="content"><ContentEditPage /></ProtectedRoute>} />
          <Route path="content/:id" element={<ProtectedRoute requiredRole="content"><ContentEditPage /></ProtectedRoute>} />
          <Route path="contact">
            <Route index element={<ProtectedRoute requiredRole="contact"><ContactBeheerPage /></ProtectedRoute>} />
            <Route path="gegevens" element={<Navigate to="/beheer/contact" replace />} />
            <Route path="locatie" element={<Navigate to="/beheer/contact" replace />} />
            <Route path="wie-doet-wat" element={<ProtectedRoute requiredRole="contact"><WieDoetWatBeheerPage /></ProtectedRoute>} />
          </Route>
          <Route path="vrijwilligers" element={<ProtectedRoute requiredRole="vrijwilligers"><VrijwilligersBeheerPage /></ProtectedRoute>} />
          <Route path="lid-worden" element={<ProtectedRoute requiredRole="lid-worden"><LidWordenBeheerPage /></ProtectedRoute>} />
        </Route>
        <Route path="wedstrijden" element={<WedstrijdenLayout />}>
          <Route index element={<Navigate to="programma" replace />} />
          <Route path="programma" element={<WedstrijdenProgrammaPage />} />
          <Route path="uitslagen" element={<WedstrijdenUitslagenPage />} />
          <Route path="standen" element={<WedstrijdenStandenPage />} />
          <Route path="afgelastingen" element={<WedstrijdenAfgelastingenPage />} />
          <Route path="verslagen" element={<PlaceholderPage title="Wedstrijdverslagen" />} />
          <Route path="topscorers" element={<PlaceholderPage title="Topscorers & Keeperstrofee" />} />
        </Route>
        <Route path="pagina/:slug" element={<ContentPage />} />
        <Route path="nieuws">
          <Route index element={<NieuwsPage />} />
          <Route path=":slug" element={<NieuwsDetailPage />} />
        </Route>
        <Route path="vrijwilliger" element={<VrijwilligerWordenPage />} />
        <Route path="lid-worden" element={<LidWordenPage />} />
        <Route path="techniektrainingen" element={<PlaceholderPage title="Techniektrainingen" />} />
        <Route path="sponsors" element={<SponsorsPage />} />
        <Route path="sponsors/:slug" element={<SponsorDetailPage />} />
        <Route path="sponsoring">
          <Route path="sponsor-worden" element={<SponsorWordenPage />} />
          <Route path="acties" element={<PlaceholderPage title="Sponsor Acties" />} />
          <Route path="beheer" element={
            <ProtectedRoute adminOnly>
              <SponsoringBeheerPage />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="club">
          <Route path="historie" element={<PlaceholderPage title="Historie" />} />
          <Route path="ereleden" element={<EreledenPage />} />
          <Route path="reglementen" element={<ReglemenenPage />} />
        </Route>

        <Route path="contact">
          <Route index element={<PlaceholderPage title="Contact" />} />
          <Route path="gegevens" element={<ContactgegevensPage />} />
          <Route path="wie-doet-wat" element={<WieDoetWatPage />} />
          <Route path="locatie" element={<LocatieRoutebeschrijvingPage />} />
        </Route>
        <Route path="teams/senioren" element={<WedstrijdenTeamsCatPage />} />
        <Route path="teams/veteranen" element={<WedstrijdenTeamsCatPage />} />
        <Route path="teams/junioren" element={<WedstrijdenTeamsCatPage />} />
        <Route path="teams/pupillen" element={<WedstrijdenTeamsCatPage />} />
        <Route path="teams/zaalvoetbal" element={<WedstrijdenTeamsZaalPage />} />
        <Route path="teams/:teamcode" element={<TeamPage />} />
        <Route path="plattegrond" element={<PlattegrondPage />} />
        <Route path="huistijl" element={<HuistijlPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="email-bevestigd" element={<EmailBevestigdPage />} />
        <Route path="wachtwoord-vergeten" element={<WachtwoordVergetenPage />} />
        <Route path="wachtwoord-resetten" element={<WachtwoordResettenPage />} />
        <Route path="wachtwoord-instellen" element={<WachtwoordInstellenPage />} />
      </Route>
    </Routes>
  )
}
