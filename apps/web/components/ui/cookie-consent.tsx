"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      // Use a small timeout or just skip the warning if it's not critical,
      // but let's try to be compliant.
      const timer = setTimeout(() => setShow(true), 100);
      return () => clearTimeout(timer);
    } else {
      const parsedConsent = JSON.parse(consent);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (typeof window !== "undefined" && win.gtag) {
        win.gtag('consent', 'update', {
          'analytics_storage': parsedConsent.analytics ? 'granted' : 'denied',
          'ad_storage': parsedConsent.marketing ? 'granted' : 'denied',
        });
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = { analytics: true, marketing: true, functional: true, essential: true };
    localStorage.setItem("cookie-consent", JSON.stringify(consent));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (typeof window !== "undefined" && win.gtag) {
      win.gtag('consent', 'update', {
        'analytics_storage': 'granted',
        'ad_storage': 'granted',
      });
    }
    
    setShow(false);
    toast.success("Preferencias de cookies guardadas");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[400px] z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="glass p-8 rounded-3xl border-primary/20 shadow-2xl">
        <h3 className="text-xl font-bold mb-4">🍪 Tu privacidad nos importa</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y personalizar el contenido.
          Al continuar navegando, aceptas nuestro uso de cookies.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={handleAcceptAll} className="w-full rounded-full bg-primary hover:brightness-110 shadow-lg">
            Aceptar todas
          </Button>
          <Button variant="outline" onClick={() => setShow(false)} className="w-full rounded-full border-white/10 hover:bg-white/5">
            Solo esenciales
          </Button>
        </div>
      </div>
    </div>
  );
}
