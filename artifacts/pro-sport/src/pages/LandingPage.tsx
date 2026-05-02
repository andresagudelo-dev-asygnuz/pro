import { HeroSection } from "@/components/landing/HeroSection";
import { ChallengeSection } from "@/components/landing/ChallengeSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { LocalFocusSection } from "@/components/landing/LocalFocusSection";
import { RegistrationForm } from "@/components/landing/RegistrationForm";
import { LaunchBanner } from "@/components/landing/LaunchBanner";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <LaunchBanner />
      <HeroSection />
      <ChallengeSection />
      <SolutionSection />
      <FeaturesSection />
      <LocalFocusSection />
      <RegistrationForm />

      <footer className="bg-zinc-100 dark:bg-zinc-950 py-16 border-t border-zinc-200 dark:border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-30" />
        <div className="container mx-auto px-6 text-center">
          <div className="mb-8 flex justify-center items-center gap-4">
            <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-800" />
            <span className="text-2xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
              PRO<span className="text-brand-primary">.</span>
            </span>
            <div className="h-px w-8 bg-zinc-300 dark:bg-zinc-800" />
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 font-bold mb-2 uppercase tracking-widest text-xs">
            Vive el deporte como un profesional
          </p>
          <p className="text-zinc-400 dark:text-zinc-500 text-xs">© 2026 Asygnuz. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
