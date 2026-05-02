import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";

const supabase = createClient();

type Question = { id: string; text: string; type: "choice" | "open"; options?: string[] };

const questions: Question[] = [
  { id: "q1", text: "¿Con qué frecuencia buscás partidos de fútbol en tu ciudad?", type: "choice", options: ["Varias veces por semana", "Una vez por semana", "Una o dos veces al mes", "Rara vez"] },
  { id: "q2", text: "¿Cuál es tu mayor dificultad para encontrar un partido?", type: "choice", options: ["No sé dónde buscar", "Los horarios no coinciden", "No tengo con quién jugar", "Las canchas son caras"] },
  { id: "q3", text: "¿Estarías dispuesto a pagar una suscripción mensual por acceder a partidos y torneos organizados?", type: "choice", options: ["Sí, definitivamente", "Probablemente sí", "No lo sé", "Probablemente no"] },
  { id: "q4", text: "¿Qué característica te parece más valiosa en una plataforma deportiva?", type: "open" },
  { id: "q5", text: "¿En qué ciudad estás?", type: "open" },
];

export default function FeedbackPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const current = questions[step];

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    await supabase.from("feedback").insert({
      answers,
      submitted_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A2E] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-5xl">⚽</div>
          <h1 className="text-3xl font-bold text-white">¡Gracias por tu aporte!</h1>
          <p className="text-gray-400">Tus respuestas nos ayudan a construir PRO para vos y para toda la comunidad deportiva.</p>
          <Button onClick={() => { setSubmitted(false); setStep(0); setAnswers({}); }}>Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A2E] flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-white">PRO Challenge</h1>
          <p className="text-gray-400 text-sm">Validación deportiva · Pregunta {step + 1} de {questions.length}</p>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <p className="text-white text-lg font-medium">{current.text}</p>

          {current.type === "choice" && current.options && (
            <div className="flex flex-col gap-2">
              {current.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswer(current.id, opt)}
                  className={`text-left px-4 py-3 rounded-xl border transition-all text-sm ${answers[current.id] === opt ? "border-purple-500 bg-purple-500/20 text-white" : "border-white/10 text-gray-300 hover:border-white/30 hover:bg-white/5"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {current.type === "open" && (
            <textarea
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-500 min-h-[100px] resize-none"
              placeholder="Escribí tu respuesta…"
              value={answers[current.id] ?? ""}
              onChange={(e) => setAnswer(current.id, e.target.value)}
            />
          )}
        </div>

        <div className="flex justify-between gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="border-white/20 text-white hover:bg-white/10">
              Anterior
            </Button>
          )}
          <div className="flex-1" />
          {step < questions.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!answers[current.id]} className="bg-purple-600 hover:bg-purple-700">
              Siguiente
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting || !answers[current.id]} className="bg-purple-600 hover:bg-purple-700">
              {submitting ? "Enviando…" : "Enviar respuestas"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
