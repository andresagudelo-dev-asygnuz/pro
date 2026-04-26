import { HeroSection } from "./hero-section";
import { ChallengeSection } from "./challenge-section";
import { SolutionSection } from "./solution-section";
import { FeaturesSection } from "./features-section";
import { LocalFocusSection } from "./local-focus-section";
import { RegistrationForm } from "./registration-form";
import { MainFooter } from "./main-footer";

export function LandingPage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <ChallengeSection />
      <SolutionSection />
      <FeaturesSection />
      <LocalFocusSection />
      <RegistrationForm />
      <MainFooter />
    </main>
  );
}
