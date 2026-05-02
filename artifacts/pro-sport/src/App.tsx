import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import FeedPage from "@/pages/FeedPage";
import ProfilePage from "@/pages/ProfilePage";
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
      <Route path="/" component={LandingPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route path="/feed" component={FeedPage} />
      <Route path="/perfil" component={ProfilePage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/notificaciones" component={NotificationsPage} />
      <Route path="/verificacion" component={VerificationPage} />
      <Route path="/feedback" component={FeedbackPage} />

      <Route path="/matches/new" component={NewMatchPage} />
      <Route path="/matches/:id" component={MatchDetailPage} />

      <Route path="/tournaments" component={TournamentsPage} />
      <Route path="/tournaments/new" component={NewTournamentPage} />
      <Route path="/tournaments/mine" component={MyTournamentsPage} />
      <Route path="/tournaments/:id" component={TournamentDetailPage} />
      <Route path="/tournaments/:id/matches" component={TournamentMatchesPage} />
      <Route path="/tournaments/:id/matches/new" component={TournamentNewMatchPage} />
      <Route path="/tournaments/:id/matches/:matchId" component={TournamentMatchResultPage} />
      <Route path="/tournaments/:id/standings" component={TournamentStandingsPage} />
      <Route path="/tournaments/:id/register" component={TournamentRegisterPage} />
      <Route path="/tournaments/:id/registrations" component={TournamentRegistrationsPage} />

      <Route path="/profile/:id" component={UserProfilePage} />
      <Route path="/u/:slug" component={PublicProfilePage} />

      <Route path="/admin/venues" component={AdminVenuesPage} />
      <Route path="/admin/verificaciones" component={AdminVerificationsPage} />

      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
