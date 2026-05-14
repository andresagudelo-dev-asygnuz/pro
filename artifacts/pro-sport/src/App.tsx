import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { NotifProvider } from "@/context/NotifContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager — first visible pages, keep small
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
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
const CanchaDetailPage           = lazy(() => import("@/pages/CanchaDetailPage"));
const MisCanchasPage             = lazy(() => import("@/pages/MisCanchasPage"));
const NuevaCanchaPage            = lazy(() => import("@/pages/NuevaCanchaPage"));
const CanchaAgendaPage           = lazy(() => import("@/pages/CanchaAgendaPage"));
const EditCanchaPage             = lazy(() => import("@/pages/EditCanchaPage"));
const CanchaClientesPage         = lazy(() => import("@/pages/CanchaClientesPage"));
const CanchaStatsPage            = lazy(() => import("@/pages/CanchaStatsPage"));
const CanchaEquipoPage           = lazy(() => import("@/pages/CanchaEquipoPage"));
const OwnerDashboardPage         = lazy(() => import("@/pages/OwnerDashboardPage"));
const OwnerProfilePage           = lazy(() => import("@/pages/OwnerProfilePage"));
const OwnerProfileEditPage       = lazy(() => import("@/pages/OwnerProfileEditPage"));
const MisReservasPage            = lazy(() => import("@/pages/MisReservasPage"));

const ChatListPage               = lazy(() => import("@/pages/ChatListPage"));
const ChatDetailPage             = lazy(() => import("@/pages/ChatDetailPage"));

const FriendsPage                = lazy(() => import("@/pages/FriendsPage"));
const TeamsPage                  = lazy(() => import("@/pages/TeamsPage"));
const NewTeamPage                = lazy(() => import("@/pages/NewTeamPage"));
const TeamDetailPage             = lazy(() => import("@/pages/TeamDetailPage"));

const AdminVenuesPage            = lazy(() => import("@/pages/AdminVenuesPage"));
const AdminVerificationsPage     = lazy(() => import("@/pages/AdminVerificationsPage"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
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
          <ErrorBoundary><ProtectedRoute component={ProfilePage} /></ErrorBoundary>
        </Route>
        <Route path="/perfil/editar">
          <ErrorBoundary><ProtectedRoute component={ProfileEditPage} /></ErrorBoundary>
        </Route>
        <Route path="/onboarding">
          <ErrorBoundary><ProtectedRoute component={OnboardingPage} /></ErrorBoundary>
        </Route>
        <Route path="/notificaciones">
          <ErrorBoundary><ProtectedRoute component={NotificationsPage} /></ErrorBoundary>
        </Route>
        <Route path="/verificacion">
          <ErrorBoundary><ProtectedRoute component={VerificationPage} /></ErrorBoundary>
        </Route>

        <Route path="/matches/new">
          <ErrorBoundary><ProtectedRoute component={NewMatchPage} /></ErrorBoundary>
        </Route>
        <Route path="/matches/:id/edit">
          <ErrorBoundary><ProtectedRoute component={EditMatchPage} /></ErrorBoundary>
        </Route>
        <Route path="/matches/:id">
          <ErrorBoundary><ProtectedRoute component={MatchDetailPage} /></ErrorBoundary>
        </Route>

        <Route path="/tournaments">
          <ErrorBoundary><ProtectedRoute component={TournamentsPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/new">
          <ErrorBoundary><ProtectedRoute component={NewTournamentPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/mine">
          <ErrorBoundary><ProtectedRoute component={MyTournamentsPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id">
          <ErrorBoundary><ProtectedRoute component={TournamentDetailPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches">
          <ErrorBoundary><ProtectedRoute component={TournamentMatchesPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches/new">
          <ErrorBoundary><ProtectedRoute component={TournamentNewMatchPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/matches/:matchId">
          <ErrorBoundary><ProtectedRoute component={TournamentMatchResultPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/standings">
          <ErrorBoundary><ProtectedRoute component={TournamentStandingsPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/register">
          <ErrorBoundary><ProtectedRoute component={TournamentRegisterPage} /></ErrorBoundary>
        </Route>
        <Route path="/tournaments/:id/registrations">
          <ErrorBoundary><ProtectedRoute component={TournamentRegistrationsPage} /></ErrorBoundary>
        </Route>

        <Route path="/mis-partidos">
          <ErrorBoundary><ProtectedRoute component={MisPartidosPage} /></ErrorBoundary>
        </Route>
        <Route path="/mis-reservas">
          <ErrorBoundary><ProtectedRoute component={MisReservasPage} /></ErrorBoundary>
        </Route>

        {/* Canchas management — specific sub-routes before /:id */}
        <Route path="/mis-canchas/perfil/editar">
          <ErrorBoundary><ProtectedRoute component={OwnerProfileEditPage} /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/perfil">
          <ErrorBoundary><ProtectedRoute component={OwnerProfilePage} /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas/dashboard">
          <ErrorBoundary><ProtectedRoute component={OwnerDashboardPage} /></ErrorBoundary>
        </Route>
        <Route path="/mis-canchas">
          <ErrorBoundary><ProtectedRoute component={MisCanchasPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/nueva">
          <ErrorBoundary><ProtectedRoute component={NuevaCanchaPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/agenda">
          <ErrorBoundary><ProtectedRoute component={CanchaAgendaPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/editar">
          <ErrorBoundary><ProtectedRoute component={EditCanchaPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/clientes">
          <ErrorBoundary><ProtectedRoute component={CanchaClientesPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/stats">
          <ErrorBoundary><ProtectedRoute component={CanchaStatsPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id/equipo">
          <ErrorBoundary><ProtectedRoute component={CanchaEquipoPage} /></ErrorBoundary>
        </Route>
        <Route path="/canchas/:id">
          <ErrorBoundary><CanchaDetailPage /></ErrorBoundary>
        </Route>

        {/* Chat */}
        <Route path="/chat/:id">
          <ErrorBoundary><ProtectedRoute component={ChatDetailPage} /></ErrorBoundary>
        </Route>
        <Route path="/chat">
          <ErrorBoundary><ProtectedRoute component={ChatListPage} /></ErrorBoundary>
        </Route>

        <Route path="/amigos">
          <ErrorBoundary><ProtectedRoute component={FriendsPage} /></ErrorBoundary>
        </Route>

        <Route path="/equipos/nuevo">
          <ErrorBoundary><ProtectedRoute component={NewTeamPage} /></ErrorBoundary>
        </Route>
        <Route path="/equipos/:id">
          <ErrorBoundary><ProtectedRoute component={TeamDetailPage} /></ErrorBoundary>
        </Route>
        <Route path="/equipos">
          <ErrorBoundary><ProtectedRoute component={TeamsPage} /></ErrorBoundary>
        </Route>

        <Route path="/profile/:id">
          <ErrorBoundary><ProtectedRoute component={UserProfilePage} /></ErrorBoundary>
        </Route>

        <Route path="/admin/venues">
          <ErrorBoundary><ProtectedRoute component={AdminVenuesPage} /></ErrorBoundary>
        </Route>
        <Route path="/admin/verificaciones">
          <ErrorBoundary><ProtectedRoute component={AdminVerificationsPage} /></ErrorBoundary>
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
        </NotifProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
