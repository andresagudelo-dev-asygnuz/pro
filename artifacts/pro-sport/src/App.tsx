import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { NotifProvider } from "@/context/NotifContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLastRoute } from "@/hooks/useLastRoute";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";

// Eager — first visible pages, keep small
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OwnerBookingsPage from "@/pages/OwnerBookingsPage";
import NotFoundPage from "@/pages/NotFoundPage";

// Lazy — loaded on demand
const FeedPage                   = lazy(() => import("@/pages/FeedPage"));
const ProfilePage                = lazy(() => import("@/pages/ProfilePage"));
const ProfileEditPage            = lazy(() => import("@/pages/ProfileEditPage"));
const OnboardingPage             = lazy(() => import("@/pages/OnboardingPage"));
const NotificationsPage          = lazy(() => import("@/pages/NotificationsPage"));
const VerificationPage           = lazy(() => import("@/pages/VerificationPage"));
const ForgotPasswordPage         = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage          = lazy(() => import("@/pages/ResetPasswordPage"));
const FeedbackPage               = lazy(() => import("@/pages/FeedbackPage"));
const PublicProfilePage          = lazy(() => import("@/pages/PublicProfilePage"));
const UserProfilePage            = lazy(() => import("@/pages/UserProfilePage"));

const NewMatchPage               = lazy(() => import("@/pages/NewMatchPage"));
const EditMatchPage              = lazy(() => import("@/pages/EditMatchPage"));
const MatchDetailPage            = lazy(() => import("@/pages/MatchDetailPage"));
const MisPartidosPage            = lazy(() => import("@/pages/MisPartidosPage"));
const LeaderboardPage            = lazy(() => import("@/pages/LeaderboardPage"));

const TournamentsPage            = lazy(() => import("@/pages/TournamentsPage"));
const NewTournamentPage          = lazy(() => import("@/pages/NewTournamentPage"));
const MyTournamentsPage          = lazy(() => import("@/pages/MyTournamentsPage"));
const TournamentDetailPage       = lazy(() => import("@/pages/TournamentDetailPage"));
const TournamentMatchesPage      = lazy(() => import("@/pages/TournamentMatchesPage"));
const TournamentNewMatchPage     = lazy(() => import("@/pages/TournamentNewMatchPage"));
const TournamentMatchResultPage  = lazy(() => import("@/pages/TournamentMatchResultPage"));
const TournamentStandingsPage    = lazy(() => import("@/pages/TournamentStandingsPage"));
const TournamentRegisterPage     = lazy(() => import("@/pages/TournamentRegisterPage"));
const TournamentRegistrationsPage = lazy(() => import("@/pages/TournamentRegistrationsPage"));

const CanchasPage                = lazy(() => import("@/pages/CanchasPage"));
const VenueDetailPage            = lazy(() => import("@/pages/VenueDetailPage"));
const CanchaDetailPage           = lazy(() => import("@/pages/CanchaDetailPage"));
const MisCanchasPage             = lazy(() => import("@/pages/MisCanchasPage"));
const NuevaCanchaPage            = lazy(() => import("@/pages/NuevaCanchaPage"));
const CanchaAgendaPage           = lazy(() => import("@/pages/CanchaAgendaPage"));
const EditCanchaPage             = lazy(() => import("@/pages/EditCanchaPage"));
const CanchaClientesPage         = lazy(() => import("@/pages/CanchaClientesPage"));
const CanchaClienteDetallePage   = lazy(() => import("@/pages/CanchaClienteDetallePage"));
const OwnerDashboardPage         = lazy(() => import("@/pages/OwnerDashboardPage"));
const OwnerVenuePage             = lazy(() => import("@/pages/OwnerVenuePage"));
const OwnerVenueEditPage         = lazy(() => import("@/pages/OwnerVenueEditPage"));
const OwnerEquipoPage            = lazy(() => import("@/pages/OwnerEquipoPage"));
const OwnerPendingPage           = lazy(() => import("@/pages/OwnerPendingPage"));
const OwnerProfilePage           = lazy(() => import("@/pages/OwnerProfilePage"));
const OwnerProfileEditPage       = lazy(() => import("@/pages/OwnerProfileEditPage"));
const MisReservasPage            = lazy(() => import("@/pages/MisReservasPage"));

const ChatPage                   = lazy(() => import("@/pages/ChatPage"));

const FriendsPage                = lazy(() => import("@/pages/FriendsPage"));
const JugadoresPage              = lazy(() => import("@/pages/JugadoresPage"));
const TeamsPage                  = lazy(() => import("@/pages/TeamsPage"));
const NewTeamPage                = lazy(() => import("@/pages/NewTeamPage"));
const TeamDetailPage             = lazy(() => import("@/pages/TeamDetailPage"));

const AdminVenuesPage            = lazy(() => import("@/pages/AdminVenuesPage"));
const AdminVerificationsPage     = lazy(() => import("@/pages/AdminVerificationsPage"));
const CanchaStatsPage            = lazy(() => import("@/pages/CanchaStatsPage"));

import { PageLoader } from "@/components/ui/PageLoader";

const queryClient = new QueryClient();

function Router() {
  useLastRoute(); // Persist current route for session restore
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Public routes */}
        <Route path="/">
          <ErrorBoundary><LandingPage /></ErrorBoundary>
        </Route>
        <Route path="/login">
          <ErrorBoundary><LoginPage /></ErrorBoundary>
        </Route>
        <Route path="/signup">
          <ErrorBoundary><SignupPage /></ErrorBoundary>
        </Route>
        <Route path="/registro">
          <ErrorBoundary><SignupPage /></ErrorBoundary>
        </Route>
        <Route path="/recuperar-contrasena">
          <ErrorBoundary><ForgotPasswordPage /></ErrorBoundary>
        </Route>
        <Route path="/nueva-contrasena">
          <ErrorBoundary><ResetPasswordPage /></ErrorBoundary>
        </Route>
        <Route path="/feedback">
          <ErrorBoundary><FeedbackPage /></ErrorBoundary>
        </Route>
        <Route path="/u/:slug">
          <ErrorBoundary><PublicProfilePage /></ErrorBoundary>
        </Route>
        <Route path="/canchas">
          <ErrorBoundary><CanchasPage /></ErrorBoundary>
        </Route>

        {/* Protected routes */}
        <Route path="/feed">
          <ErrorBoundary><ProtectedRoute component={FeedPage} /></ErrorBoundary>
        </Route>
        <Route path="/perfil">
          <ErrorBoundary>
            <ProtectedRoute component={ProfilePage} layout="none" />
          </ErrorBoundary>
        </Route>
        <Route path="/perfil/editar">
          <ErrorBoundary><ProtectedRoute component={ProfileEditPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/onboarding">
          <ErrorBoundary><ProtectedRoute component={OnboardingPage} /></ErrorBoundary>
        </Route>
        <Route path="/notificaciones">
          <ErrorBoundary><ProtectedRoute component={NotificationsPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/verificacion">
          <ErrorBoundary><ProtectedRoute component={VerificationPage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/matches/new">
          <ErrorBoundary><ProtectedRoute component={NewMatchPage} /></ErrorBoundary>
        </Route>
        <Route path="/matches/:id/edit">
          <ErrorBoundary><ProtectedRoute component={EditMatchPage} /></ErrorBoundary>
        </Route>
        <Route path="/matches/:id">
          <ErrorBoundary><ProtectedRoute component={MatchDetailPage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/tournaments">
          <ErrorBoundary><ProtectedRoute component={TournamentsPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/new">
          <ErrorBoundary><ProtectedRoute component={NewTournamentPage} requireRole="is_promoter" layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/mine">
          <ErrorBoundary><ProtectedRoute component={MyTournamentsPage} requireRole="is_promoter" layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id">
          <ErrorBoundary><ProtectedRoute component={TournamentDetailPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches">
          <ErrorBoundary><ProtectedRoute component={TournamentMatchesPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches/new">
          <ErrorBoundary><ProtectedRoute component={TournamentNewMatchPage} requireRole="is_promoter" layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches/:matchId">
          <ErrorBoundary><ProtectedRoute component={TournamentMatchResultPage} requireRole="is_promoter" layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/standings">
          <ErrorBoundary><ProtectedRoute component={TournamentStandingsPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/register">
          <ErrorBoundary><ProtectedRoute component={TournamentRegisterPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/registrations">
          <ErrorBoundary><ProtectedRoute component={TournamentRegistrationsPage} requireRole="is_promoter" layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/mis-partidos">
          <ErrorBoundary><ProtectedRoute component={MisPartidosPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/mis-reservas">
          <ErrorBoundary><ProtectedRoute component={MisReservasPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/ranking">
          <ErrorBoundary><ProtectedRoute component={LeaderboardPage} layout="player" /></ErrorBoundary>
        </Route>

        {/* Canchas management — specific sub-routes before /:id */}
        <Route path="/mis-canchas/centro/editar">
          <ErrorBoundary><ProtectedRoute component={OwnerVenueEditPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/centro">
          <ErrorBoundary><ProtectedRoute component={OwnerVenuePage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/perfil/editar">
          <ErrorBoundary><ProtectedRoute component={OwnerProfileEditPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/perfil">
          <ErrorBoundary><ProtectedRoute component={OwnerProfilePage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/dashboard">
          <ErrorBoundary><ProtectedRoute component={OwnerDashboardPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/equipo">
          <ErrorBoundary><ProtectedRoute component={OwnerEquipoPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/pendientes">
          <ErrorBoundary><ProtectedRoute component={OwnerPendingPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/reservas">
          <ErrorBoundary><ProtectedRoute component={OwnerBookingsPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas">
          <ErrorBoundary><ProtectedRoute component={MisCanchasPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/nueva">
          <ErrorBoundary><ProtectedRoute component={NuevaCanchaPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/agenda">
          <ErrorBoundary><ProtectedRoute component={CanchaAgendaPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/editar">
          <ErrorBoundary><ProtectedRoute component={EditCanchaPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/clientes">
          <ErrorBoundary><ProtectedRoute component={CanchaClientesPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/clientes/:userId">
          <ErrorBoundary><ProtectedRoute component={CanchaClienteDetallePage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/stats">
          <ErrorBoundary><ProtectedRoute component={CanchaStatsPage} requireRole="is_cancha" layout="owner" /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id">
          <ErrorBoundary><ProtectedRoute component={CanchaDetailPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/venues/:id">
          <ErrorBoundary><Suspense fallback={null}><VenueDetailPage /></Suspense></ErrorBoundary>
        </Route>

        {/* Chat */}
        <Route path="/chat/:id">
          <ErrorBoundary><ProtectedRoute component={ChatPage} /></ErrorBoundary>
        </Route>
        <Route path="/chat">
          <ErrorBoundary><ProtectedRoute component={ChatPage} /></ErrorBoundary>
        </Route>

        <Route path="/jugadores">
          <ErrorBoundary><ProtectedRoute component={JugadoresPage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/amigos">
          <ErrorBoundary><ProtectedRoute component={FriendsPage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/equipos/nuevo">
          <ErrorBoundary><ProtectedRoute component={NewTeamPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/equipos/:id">
          <ErrorBoundary><ProtectedRoute component={TeamDetailPage} layout="player" /></ErrorBoundary>
        </Route>
        <Route path="/equipos">
          <ErrorBoundary><ProtectedRoute component={TeamsPage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/profile/:id">
          <ErrorBoundary><ProtectedRoute component={UserProfilePage} layout="player" /></ErrorBoundary>
        </Route>

        <Route path="/admin/venues">
          <ErrorBoundary><ProtectedRoute component={AdminVenuesPage} requireRole="is_admin" layout="none" /></ErrorBoundary>
        </Route>
        <Route path="/admin/verificaciones">
          <ErrorBoundary><ProtectedRoute component={AdminVerificationsPage} requireRole="is_admin" layout="none" /></ErrorBoundary>
        </Route>

        <Route component={NotFoundPage} />
      </Switch>
    </Suspense>
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
          <PwaInstallBanner />
        </NotifProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
