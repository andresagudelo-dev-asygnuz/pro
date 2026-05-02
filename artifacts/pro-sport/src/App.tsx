import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
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
import FeedbackPage from "@/pages/FeedbackPage";
import NotFoundPage from "@/pages/NotFoundPage";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/registro" component={SignupPage} />
      <Route path="/feedback" component={FeedbackPage} />
      <Route path="/u/:slug" component={PublicProfilePage} />

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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
