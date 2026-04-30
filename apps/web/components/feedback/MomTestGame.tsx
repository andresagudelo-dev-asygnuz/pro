"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import {
  Trophy,
  Gamepad2,
  Target,
  Users,
  Clock,
  MessageCircle,
  Zap,
  CheckCircle2,
  Star,
  ArrowRight,
  ShieldCheck,
  X,
  MapPin,
  Flame,
  Search,
  AlertTriangle,
  History,
  Mail,
  User,
  Heart,
  Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

type Step = "intro" | "contact" | "basics" | "role" | "pz1" | "pains" | "behavior" | "pz2" | "pz3" | "commitment" | "referral" | "thanks" | "final";

type ThanksContentProps = {
  contentWrapperRef: React.RefObject<HTMLDivElement | null>;
  fireConfetti: () => void;
};

function ThanksContent({ contentWrapperRef, fireConfetti }: ThanksContentProps) {
  useEffect(() => {
    trackEvent('game_finish');
    fireConfetti();
    const timer = setTimeout(fireConfetti, 1000);
    return () => clearTimeout(timer);
  }, [fireConfetti]);

  return (
    <div ref={contentWrapperRef} className="flex flex-col items-center text-center space-y-8 z-10">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-12 h-12 text-sport-neon" />
      </div>
      <h2 className="text-4xl font-black uppercase">¡GRACIAS POR TU TIEMPO!</h2>
      <p className="text-slate-300 max-w-md">
        Tus comentarios son invaluables para nosotros. Nos ayudarán a construir la mejor plataforma para los deportistas de Manizales.
      </p>
      <button onClick={() => window.location.href = "/"} className="sport-button font-black uppercase">
        VOLVER AL INICIO
      </button>
    </div>
  );
}

interface GameData {
  name: string;
  email: string;
  age: string;
  gender: string;
  main_sport: string;
  frequency: string;
  role: string;
  organizer_type: string;
  tools: string[];
  problems: string;
  pain_intensity: string;
  beta_interest: boolean;
  commitment_feedback: boolean;
  referral_intent: boolean;
  lost_money: boolean;
  searched_solution: boolean;
  digital_payment: boolean;
  bad_experience_unknowns: boolean;
  limited_venues_knowledge: boolean;
  coordination_time_hours: number;
}

export default function MomTestGame() {
  const [currentStep, setCurrentStep] = useState<Step>("intro");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [data, setData] = useState<GameData>({
    name: "",
    email: "",
    age: "",
    gender: "",
    main_sport: "",
    frequency: "",
    role: "",
    organizer_type: "",
    tools: [],
    problems: "",
    pain_intensity: "",
    beta_interest: false,
    commitment_feedback: false,
    referral_intent: false,
    lost_money: false,
    searched_solution: false,
    digital_payment: false,
    bad_experience_unknowns: false,
    limited_venues_knowledge: false,
    coordination_time_hours: 0
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const confettiContainerRef = useRef<HTMLDivElement>(null);
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const stepsOrder: Step[] = ["intro", "contact", "basics", "role", "pz1", "pains", "behavior", "pz2", "pz3", "commitment", "referral", "final"];
  const currentStepIndex = stepsOrder.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / stepsOrder.length) * 100;

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        contentWrapperRef.current,
        { opacity: 0, x: 50, filter: "blur(10px)" },
        { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.5, ease: "power2.out" }
      );

      gsap.to(progressRef.current, {
        width: `${progress}%`,
        duration: 0.8,
        ease: "power2.inOut"
      });
    }, containerRef);

    return () => ctx.revert();
  }, [currentStep, progress]);

  const nextStep = (customNext?: Step) => {
    const nextIdx = currentStepIndex + 1;
    const nextStepName = customNext || stepsOrder[nextIdx];

    if (contentWrapperRef.current) {
      gsap.to(contentWrapperRef.current, {
        opacity: 0,
        x: -50,
        filter: "blur(10px)",
        duration: 0.3,
        onComplete: () => {
          if (nextStepName) setCurrentStep(nextStepName);
        }
      });
    } else {
      if (nextStepName) setCurrentStep(nextStepName);
    }
  };

  const handleSelection = (field: keyof GameData, value: GameData[keyof GameData]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const fireConfetti = useCallback(() => {
    if (!confettiContainerRef.current) return;
    const colors = ["#00B5D8", "#6B46C1", "#9F7AEA", "#ffffff"];
    for (let i = 0; i < 150; i++) {
      const piece = document.createElement("div");
      piece.className = "absolute w-2 h-2 rounded-full";
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confettiContainerRef.current.appendChild(piece);
      gsap.fromTo(piece,
        { x: window.innerWidth / 2, y: window.innerHeight + 10 },
        {
          x: Math.random() * window.innerWidth,
          y: Math.random() * -200,
          rotation: Math.random() * 720,
          duration: 2 + Math.random() * 3,
          ease: "power2.out",
          onComplete: () => piece.remove()
        }
      );
    }
  }, []);

  const handleSubmit = async (isFinal: boolean = false) => {
    setIsSubmitting(true);
    console.log("Intentando guardar datos:", data);

    try {
      const { error, data: insertedData } = await supabase
        .from("market_validation_responses")
        .insert([{
          name: data.name,
          email: data.email,
          age: data.age,
          gender: data.gender,
          main_sport: data.main_sport,
          frequency: data.frequency,
          role: data.role,
          organizer_type: data.organizer_type,
          tools: data.tools || [],
          problems: data.problems,
          pain_intensity: data.pain_intensity,
          beta_interest: data.beta_interest,
          lost_money: data.lost_money,
          searched_solution: data.searched_solution,
          digital_payment: data.digital_payment,
          bad_experience_unknowns: data.bad_experience_unknowns,
          limited_venues_knowledge: data.limited_venues_knowledge,
          coordination_time_hours: data.coordination_time_hours,
          signals: {
            ...data, // Guardamos TODO el objeto como backup en el JSONB
            commitment_feedback: data.commitment_feedback,
            referral_intent: data.referral_intent,
            source: "feedback_game"
          }
        }]);

      if (error) {
        console.error("Error de Supabase (RLS o Constraints):", error);
        throw new Error(error.message);
      }

      console.log("Datos guardados con éxito");

      if (isFinal) {
        fireConfetti();
        setShowModal(true);
      } else {
        nextStep("thanks");
      }
    } catch (err: unknown) {
      console.error("Error completo:", err);
      const message = err instanceof Error ? err.message : "Problema de conexión";
      alert(`Error al guardar: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERS ---

  const renderIntro = () => (
    <div ref={contentWrapperRef} className="flex flex-col items-center text-center space-y-8 z-10">
      <div className="relative">
        <Trophy className="w-24 h-24 text-sport-neon animate-pulse-neon" />
        <div className="absolute -inset-4 bg-sport-neon/20 blur-2xl rounded-full -z-10" />
      </div>
      <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter">
        PRO <span className="text-sport-neon">Challenge</span>
      </h1>
      <p className="text-xl text-slate-300 max-w-lg">
        La validación definitiva del deporte en Manizales.
        ¿Estás listo para el nivel profesional?
      </p>
      <button onClick={() => { trackEvent('game_start'); nextStep(); }} className="sport-button text-xl flex items-center gap-3 group">
        <span>¡EMPEZAR!</span>
        <Gamepad2 className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );

  const renderContact = () => {
    const handleStartChallenge = async () => {
      if (!data.email) return;
      setCheckingEmail(true);
      
      try {
        const { data: existing, error } = await supabase
          .from("market_validation_responses")
          .select("id")
          .eq("email", data.email)
          .single();

        if (existing) {
          alert("¡Hola! Ya hemos recibido tus datos anteriormente. ¡Gracias por tu interés en PRO!");
          window.location.href = "/";
          return;
        }

        trackEvent('game_contact_submit');
        nextStep();
      } catch (err) {
        // Si no se encuentra (error PGRST116), podemos continuar
        nextStep();
      } finally {
        setCheckingEmail(false);
      }
    };

    return (
      <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
        <div className="flex items-center gap-3 text-sport-neon">
          <User className="w-6 h-6" />
          <span className="font-bold tracking-widest uppercase text-sm">IDENTIFICACIÓN</span>
        </div>
        <h2 className="text-3xl font-bold">Antes de empezar el reto, dinos quién eres</h2>
        <div className="space-y-4">
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Nombre Completo"
              value={data.name}
              className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:border-sport-neon focus:outline-none transition-colors"
              onChange={(e) => handleSelection("name", e.target.value)}
            />
          </div>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input
              type="email"
              placeholder="Email de contacto"
              value={data.email}
              className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl pl-12 pr-4 py-4 focus:border-sport-neon focus:outline-none transition-colors"
              onChange={(e) => handleSelection("email", e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleStartChallenge}
            disabled={!data.name || !data.email || checkingEmail}
            className="sport-button flex items-center gap-2 disabled:opacity-50"
          >
            {checkingEmail ? "VERIFICANDO..." : "INICIAR RETO"} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  const renderBasics = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-blue">
        <Users className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">INFO BÁSICA</span>
      </div>
      <h2 className="text-3xl font-bold">Un par de detalles más...</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">¿Cuál es tu deporte?</label>
          <select value={data.main_sport} onChange={(e) => handleSelection("main_sport", e.target.value)} className="custom-select">
            <option value="">Selecciona...</option>
            <option value="futbol">Fútbol</option>
            <option value="padel">Padel</option>
            <option value="running">Running</option>
            <option value="tennis">Tennis</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase">Rango de Edad</label>
          <select value={data.age} onChange={(e) => handleSelection("age", e.target.value)} className="custom-select">
            <option value="">Selecciona...</option>
            <option value="18-24">18-24</option>
            <option value="25-34">25-34</option>
            <option value="35-44">35-44</option>
            <option value="45+">45+</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} disabled={!data.main_sport || !data.age} className="sport-button flex items-center gap-2 disabled:opacity-50">
          SIGUIENTE <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderRole = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-purple">
        <Gamepad2 className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">TU ROL</span>
      </div>
      <h2 className="text-3xl font-bold">¿Cómo participas habitualmente?</h2>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: "habitual", label: "Organizador Habitual", desc: "Yo armo los partidos casi siempre" },
          { id: "occasional", label: "Organizador Ocasional", desc: "A veces me toca coordinar" },
          { id: "participant", label: "Solo Participo", desc: "Yo solo llego a jugar" }
        ].map((role) => (
          <div key={role.id} onClick={() => handleSelection("organizer_type", role.id)} className={cn("interactive-card game-card flex flex-col gap-1 py-6", data.organizer_type === role.id && "selected")}>
            <span className="font-bold text-lg">{role.label}</span>
            <span className="text-sm text-slate-400">{role.desc}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} disabled={!data.organizer_type} className="sport-button flex items-center gap-2 disabled:opacity-50">
          CONTINUAR <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderPZ1 = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-blue">
        <Clock className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">PASO 1: TU FRECUENCIA</span>
      </div>
      <h2 className="text-3xl font-bold">¿Qué tan seguido jugaste en los últimos 3 meses?</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {["+3 veces por semana", "2 veces por semana", "1 vez por semana", "Ocasionalmente"].map((freq) => (
          <div key={freq} onClick={() => handleSelection("frequency", freq)} className={cn("interactive-card game-card text-center py-6", data.frequency === freq && "selected")}>
            <span className="font-bold">{freq}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} disabled={!data.frequency} className="sport-button flex items-center gap-2 disabled:opacity-50">
          SIGUIENTE <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderPains = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-red-500">
        <Flame className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">EL DOLOR</span>
      </div>
      <h2 className="text-3xl font-bold">¿Qué es lo que más te frustra?</h2>
      <div className="grid grid-cols-1 gap-4">
        {[
          { id: "cancellation", label: "Gente que cancela a última hora", icon: X },
          { id: "no_players", label: "No completar los equipos", icon: Users },
          { id: "no_courts", label: "Canchas siempre ocupadas", icon: MapPin },
          { id: "coordination", label: "Estar horas en WhatsApp coordinando", icon: MessageCircle }
        ].map((pain) => (
          <div key={pain.id} onClick={() => handleSelection("problems", pain.label)} className={cn("interactive-card game-card flex items-center gap-6 py-6", data.problems === pain.label && "selected")}>
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
              <pain.icon className="w-6 h-6 text-sport-neon" />
            </div>
            <span className="font-bold text-lg">{pain.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} disabled={!data.problems} className="sport-button flex items-center gap-2 disabled:opacity-50">
          CONTINUAR <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderBehavior = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-neon">
        <History className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">COMPORTAMIENTO</span>
      </div>
      <h2 className="text-3xl font-bold">¿Te ha pasado esto alguna vez?</h2>
      <div className="space-y-4">
        {[
          { id: "lost_money", label: "He perdido dinero pagando canchas por cancelaciones", icon: Target },
          { id: "searched_solution", label: "He buscado apps o webs para solucionar esto antes", icon: Search },
          { id: "digital_payment", label: "Prefiero pagar todo digital (Nequi, Tarjeta)", icon: Zap },
          { id: "bad_experience_unknowns", label: "He jugado con desconocidos y fue mala experiencia", icon: AlertTriangle }
        ].map((item) => (
          <div key={item.id} onClick={() => handleSelection(item.id as keyof GameData, !data[item.id as keyof GameData])} className={cn("interactive-card game-card flex items-center gap-6 py-4", data[item.id as keyof GameData] && "selected")}>
            <item.icon className={cn("w-6 h-6", data[item.id as keyof GameData] ? "text-sport-neon" : "text-slate-500")} />
            <span className="font-bold text-sm">{item.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} className="sport-button flex items-center gap-2">
          CONTINUAR <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderPZ2 = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-blue">
        <Zap className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">SOLUCIONES</span>
      </div>
      <h2 className="text-3xl font-bold">¿Cómo coordinas tus partidos hoy?</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
          { id: "call", label: "Llamadas", icon: Zap },
          { id: "excel", label: "Excel", icon: Target },
          { id: "notes", label: "Notas", icon: Star }
        ].map((tool) => {
          const Icon = tool.icon;
          const isSelected = data.tools.includes(tool.id);
          return (
            <div key={tool.id} onClick={() => {
              const newTools = isSelected ? data.tools.filter(t => t !== tool.id) : [...data.tools, tool.id];
              handleSelection("tools", newTools);
            }} className={cn("interactive-card game-card flex flex-col items-center gap-4 py-8", isSelected && "selected")}>
              <Icon className={cn("w-10 h-10", isSelected ? "text-sport-neon" : "text-slate-500")} />
              <span className="font-bold text-xs">{tool.label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button onClick={() => nextStep()} disabled={data.tools.length === 0} className="sport-button flex items-center gap-2 disabled:opacity-50">
          CONTINUAR <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderPZ3 = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-neon">
        <ShieldCheck className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">EL COMPROMISO</span>
      </div>
      <h2 className="text-3xl font-bold">¿Te unirías a nuestro equipo Beta?</h2>
      <div className="game-card border-sport-neon/30 bg-sport-neon/5 space-y-6">
        <p className="text-lg">
          La aplicación será **100% gratuita** para los primeros usuarios.
          Buscamos a personas que quieran ayudarnos a mejorar el deporte en Manizales.
        </p>
        <div className="flex flex-col gap-4">
          <button
            onClick={() => { trackEvent('game_beta_interest', { interested: true }); handleSelection("beta_interest", true); nextStep(); }}
            className="w-full py-4 rounded-xl border-2 border-sport-neon bg-sport-neon text-black font-black text-xl hover:bg-white hover:border-white transition-colors"
          >
            SÍ, QUIERO SER BETA
          </button>
          <button
            onClick={() => { trackEvent('game_beta_interest', { interested: false }); handleSelection("beta_interest", false); handleSubmit(false); }}
            className="w-full py-4 rounded-xl border-2 border-slate-700 text-slate-400 font-bold hover:bg-slate-800 transition-colors"
          >
            No por ahora
          </button>
        </div>
      </div>
    </div>
  );

  const renderCommitment = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-blue">
        <Heart className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">NIVEL DE AYUDA</span>
      </div>
      <h2 className="text-3xl font-bold">Para nosotros el feedback es oro</h2>
      <div className="game-card border-sport-blue/30 space-y-6">
        <p className="text-lg text-slate-300">
          ¿Estarías dispuesto a darnos 10 minutos de tu tiempo cada dos semanas para contarnos qué tal te parece la app?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { handleSelection("commitment_feedback", true); nextStep(); }}
            className={cn("py-4 rounded-xl font-black transition-all", data.commitment_feedback ? "bg-sport-blue text-white" : "bg-slate-800 text-slate-400")}
          >
            CLARO QUE SÍ
          </button>
          <button
            onClick={() => { handleSelection("commitment_feedback", false); nextStep(); }}
            className={cn("py-4 rounded-xl font-black transition-all", !data.commitment_feedback ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-400")}
          >
            ESTOY OCUPADO
          </button>
        </div>
      </div>
    </div>
  );

  const renderReferral = () => (
    <div ref={contentWrapperRef} className="space-y-8 max-w-2xl w-full z-10">
      <div className="flex items-center gap-3 text-sport-neon">
        <Share2 className="w-6 h-6" />
        <span className="font-bold tracking-widest uppercase text-sm">PASIÓN COMPARTIDA</span>
      </div>
      <h2 className="text-3xl font-bold">¿Tienes un equipo listo?</h2>
      <div className="game-card border-sport-neon/30 space-y-6">
        <p className="text-lg text-slate-300">
          ¿Compartirías la aplicación con tu grupo de WhatsApp principal para organizar el próximo partido?
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { handleSelection("referral_intent", true); handleSubmit(true); }}
            className="py-4 rounded-xl bg-sport-neon text-black font-black hover:scale-105 transition-all"
          >
            SÍ, LOS INVITARÉ
          </button>
          <button
            onClick={() => { handleSelection("referral_intent", false); handleSubmit(true); }}
            className="py-4 rounded-xl bg-slate-800 text-slate-400 font-bold hover:bg-slate-700 transition-all"
          >
            PREFIERO PROBAR SOLO
          </button>
        </div>
      </div>
    </div>
  );



  return (
    <div ref={containerRef} className="feedback-container flex flex-col items-center justify-center p-6 md:p-12 relative min-h-screen">
      <div className="feedback-bg" />
      <div className="feedback-overlay" />
      <div ref={confettiContainerRef} className="absolute inset-0 pointer-events-none z-50 overflow-hidden" />
      <div className="progress-bar-container">
        <div ref={progressRef} className="progress-bar-fill" style={{ width: "0%" }} />
      </div>
      <div className="relative z-10 w-full flex justify-center">
        {currentStep === "intro" && renderIntro()}
        {currentStep === "contact" && renderContact()}
        {currentStep === "basics" && renderBasics()}
        {currentStep === "role" && renderRole()}
        {currentStep === "pz1" && renderPZ1()}
        {currentStep === "pains" && renderPains()}
        {currentStep === "behavior" && renderBehavior()}
        {currentStep === "pz2" && renderPZ2()}
        {currentStep === "pz3" && renderPZ3()}
        {currentStep === "commitment" && renderCommitment()}
        {currentStep === "referral" && renderReferral()}
        {currentStep === "thanks" && (
          <ThanksContent
            contentWrapperRef={contentWrapperRef}
            fireConfetti={fireConfetti}
          />
        )}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="game-card max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-300 border-sport-neon/50">
            <Trophy className="w-20 h-20 text-sport-neon mx-auto" />
            <h3 className="text-3xl font-black uppercase tracking-tighter">¡LOGRO DESBLOQUEADO!</h3>
            <p className="text-slate-300">Tus datos han sido guardados con éxito. Ahora eres oficialmente un candidato para la fase Beta **GRATUITA** de PRO Manizales.</p>
            <div className="bg-sport-neon/10 rounded-2xl p-6 border border-sport-neon/20">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tu Estado</p>
              <div className="text-sport-neon font-black text-2xl uppercase neon-text">JUGADOR VALIDADO</div>
            </div>
            <button onClick={() => window.location.href = "/"} className="w-full sport-button font-black uppercase">IR AL INICIO</button>
          </div>
        </div>
      )}
      <div className="fixed bottom-6 text-slate-600 text-xs font-mono uppercase tracking-widest hidden md:block z-10">PRO</div>
    </div>
  );
}
