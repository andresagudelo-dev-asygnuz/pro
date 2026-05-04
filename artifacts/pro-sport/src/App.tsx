import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { NotifProvider } from "@/context/NotifContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import FeedPage from "@/pages/FeedPage";
import ProfilePage from "@/pages/ProfilePage";
import ProfileEditPage from "@/pages/ProfileEditPage";
import OnboardingPage from "@/pages/OnboardingPage";
import NotificationsPage from "@/pages/NotificationsPage";
import TournamentsPage from "@/pages/TournamentsPage";
import NewMatchPage from "@/pages/NewMatchPage";
import MatchDetailPage from "@/pages/MatchDetailPage";
import TournamentDetailPage from "@/pages/TournamentDetailPage";
import NewTournamentPage from "@/pages/NewTournamentPage";
import MyTournamentsPage from "@/pages/MyTournamentsPage";
import TournamentMatchesPage from "@/pages/TournamentMatchesPage";
import TournamentNewMatchPage from "@/pages/TournamentNewMatchPage";
import TournamentMatchResultPage from "@/pages/TournamentMatchResultPage";
import TournamentStandingsPage from "@/pages/TournamentStandingsPage";
import TournamentRegisterPage from "@/pages/TournamentRegisterPage";
import TournamentRegistrationsPage from "@/pages/TournamentRegistrationsPage";
import VerificationPage from "@/pages/VerificationPage";
import AdminVenuesPage from "@/pages/AdminVenuesPage";
import AdminVerificationsPage from "@/pages/AdminVerificationsPage";
import UserProfilePage from "@/pages/UserProfilePage";
import PublicProfilePage from "@/pages/PublicProfilePage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import FeedbackPage from "@/pages/FeedbackPage";
import NotFoundPage from "@/pages/NotFoundPage";
import CanchasPage from "@/pages/CanchasPage";
import CanchaDetailPage from "@/pages/CanchaDetailPage";
import MisCanchasPage from "@/pages/MisCanchasPage";
import NuevaCanchaPage from "@/pages/NuevaCanchaPage";
import CanchaAgendaPage from "@/pages/CanchaAgendaPage";
import FriendsPage from "@/pages/FriendsPage";
import MisPartidosPage from "@/pages/MisPartidosPage";
import MisReservasPage from "@/pages/MisReservasPage";
import EditCanchaPage from "@/pages/EditCanchaPage";
import TeamsPage from "@/pages/TeamsPage";
import NewTeamPage from "@/pages/NewTeamPage";
import TeamDetailPage from "@/pages/TeamDetailPage";
import EditMatchPage from "@/pages/EditMatchPage";
import ChatListPage from "@/pages/ChatListPage";
import ChatDetailPage from "@/pages/ChatDetailPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/registro" component={SignupPage} />
      <Route path="/recuperar-contrasena" component={ForgotPasswordPage} />
      <Route path="/nueva-contrasena" component={ResetPasswordPage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/u/:slug" component={PublicProfilePage} />
      <Route path="/canchas" component={CanchasPage} />

      {/* Protected routes */}
      <Route path="/feed">
        <ProtectedRoute component={FeedPage} />
      </Route>
      <Route path="/perfil">
        <ProtectedRoute component={ProfilePage} />
      </Route>
      <Route path="/perfil/editar">
        <ProtectedRoute component={ProfileEditPage} />
      </Route>
      <Route path="/onboarding">
        <ProtectedRoute component={OnboardingPage} />
      </Route>
      <Route path="/notificaciones">
        <ProtectedRoute component={NotificationsPage} />
      </Route>
      <Route path="/verificacion">
        <ProtectedRoute component={VerificationPage} />
      </Route>

      <Route path="/matches/new">
        <ProtectedRoute component={NewMatchPage} />
      </Route>
      <Route path="/matches/:id/edit">
        <ProtectedRoute component={EditMatchPage} />
      </Route>
      <Route path="/matches/:id">
        <ProtectedRoute component={MatchDetailPage} />
      </Route>

      <Route path="/tournaments">
        <ProtectedRoute component={TournamentsPage} />
      </Route>
      <Route path="/tournaments/new">
        <ProtectedRoute component={NewTournamentPage} />
      </Route>
      <Route path="/tournaments/mine">
        <ProtectedRoute component={MyTournamentsPage} />
      </Route>
      <Route path="/tournaments/:id">
        <ProtectedRoute component={TournamentDetailPage} />
      </Route>
      <Route path="/tournaments/:id/matches">
        <ProtectedRoute component={TournamentMatchesPage} />
      </Route>
      <Route path="/tournaments/:id/matches/new">
        <ProtectedRoute component={TournamentNewMatchPage} />
      </Route>
      <Route path="/tournaments/:id/matches/:matchId">
        <ProtectedRoute component={TournamentMatchResultPage} />
      </Route>
      <Route path="/tournaments/:id/standings">
        <ProtectedRoute component={TournamentStandingsPage} />
      </Route>
      <Route path="/tournaments/:id/register">
        <ProtectedRoute component={TournamentRegisterPage} />
      </Route>
      <Route path="/tournaments/:id/registrations">
        <ProtectedRoute component={TournamentRegistrationsPage} />
      </Route>

      {/* Mis actividades */}
      <Route path="/mis-partidos">
        <ProtectedRoute component={MisPartidosPage} />
      </Route>
      <Route path="/mis-reservas">
        <ProtectedRoute component={MisReservasPage} />
      </Route>

      {/* Canchas (protected management) */}
      <Route path="/mis-canchas">
        <ProtectedRoute component={MisCanchasPage} />
      </Route>
      <Route path="/canchas/nueva">
        <ProtectedRoute component={NuevaCanchaPage} />
      </Route>
      <Route path="/canchas/:id/agenda">
        <ProtectedRoute component={CanchaAgendaPage} />
      </Route>
      <Route path="/canchas/:id/editar">
        <ProtectedRoute component={EditCanchaPage} />
      </Route>
      {/* Public cancha detail — must come AFTER specific sub-routes */}
      <Route path="/canchas/:id" component={CanchaDetailPage} />

      {/* Chat */}
      <Route path="/chat/:id">
        <ProtectedRoute component={ChatDetailPage} />
      </Route>
      <Route path="/chat">
        <ProtectedRoute component={ChatListPage} />
      </Route>

      <Route path="/amigos">
        <ProtectedRoute component={FriendsPage} />
      </Route>

      <Route path="/equipos/nuevo">
        <ProtectedRoute component={NewTeamPage} />
      </Route>
      <Route path="/equipos/:id">
        <ProtectedRoute component={TeamDetailPage} />
      </Route>
      <Route path="/equipos">
        <ProtectedRoute component={TeamsPage} />
      </Route>

      <Route path="/profile/:id">
        <ProtectedRoute component={UserProfilePage} />
      </Route>

      <Route path="/admin/venues">
        <ProtectedRoute component={AdminVenuesPage} />
      </Route>
      <Route path="/admin/verificaciones">
        <ProtectedRoute component={AdminVerificationsPage} />
      </Route>

      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotifProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </NotifProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
