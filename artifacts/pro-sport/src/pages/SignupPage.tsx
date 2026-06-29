import { SignupForm } from "@/components/auth/SignupForm";
import { VideoBackground } from "@/components/landing/VideoBackground";
import { FloatingBlob } from "@/components/landing/FloatingBlob";

export default function SignupPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden px-4">
      <VideoBackground src="" poster="/multisport-bg.png" />
      
      <FloatingBlob color="bg-brand-primary" className="top-1/4 left-1/4 opacity-20" delay={0} />
      <FloatingBlob color="bg-brand-secondary" className="bottom-1/4 right-1/4 opacity-20" delay={2} />

      <div className="w-full max-w-sm relative z-10 py-12">
        <div className="text-center mb-8">
          <span className="text-4xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg">
            PRO<span className="text-brand-primary">.</span>
          </span>
          <h1 className="mt-6 text-2xl font-bold text-white tracking-tight uppercase italic">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-white/60 uppercase tracking-[0.2em]">
            Unite a la mayor comunidad deportiva
          </p>
        </div>
        
        <div className="bg-white/5 backdrop-blur-xl rounded-[28px] border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <SignupForm />
        </div>
      </div>
    </div>
  );
}
