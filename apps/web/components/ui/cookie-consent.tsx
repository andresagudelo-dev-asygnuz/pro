"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { GlassContainer } from "@/components/landing/GlassContainer"
import { Cookie, X } from "lucide-react"

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem("pro_cookie_consent")
    if (!consent) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem("pro_cookie_consent", "accepted")
    setIsVisible(false)
  }

  const handleDecline = () => {
    localStorage.setItem("pro_cookie_consent", "declined")
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 z-50 flex justify-center animate-in fade-in slide-in-from-bottom-10 duration-700">
      <GlassContainer className="max-w-4xl w-full p-6 md:p-8 border-white/20 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-shrink-0 w-12 h-12 bg-brand-primary/10 rounded-full flex items-center justify-center border border-brand-primary/20">
            <Cookie className="w-6 h-6 text-brand-primary" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">Control de Privacidad</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Utilizamos cookies para mejorar tu experiencia y analizar el tráfico de forma segura. 
              Al aceptar, nos ayudas a construir la comunidad deportiva más potente del Eje Cafetero.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <Button 
              variant="ghost" 
              onClick={handleDecline}
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white font-bold text-sm"
            >
              Configurar
            </Button>
            <Button 
              onClick={handleAccept}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase tracking-tighter italic px-8 hover:scale-105 active:scale-95 transition-all"
            >
              Aceptar Todo
            </Button>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </GlassContainer>
    </div>
  )
}
