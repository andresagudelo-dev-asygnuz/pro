// PWA Install Prompt component — shows a banner to encourage installation on Android
// and shows iOS instructions on Safari
import { useState, useEffect } from "react";
import { X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "pro:pwa-install-dismissed";

export function PwaInstallBanner() {
  const { canInstall, install, isIOS, isStandalone } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or user dismissed
    if (isStandalone) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // iOS Safari — show manual instructions
    if (isIOS) {
      setVisible(true);
      return;
    }

    // Android/Chrome — capture install prompt
    if (canInstall) {
      setVisible(true);
    }
  }, [canInstall, isIOS, isStandalone]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  async function handleInstall() {
    await install();
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[200] animate-in slide-in-from-bottom-4 duration-300 md:hidden">
      <div className="bg-zinc-950 border border-violet-500/30 rounded-2xl p-4 shadow-2xl shadow-black/50 flex items-start gap-3">
        {/* App icon */}
        <img
          src="/icons/icon-192.png"
          alt="PRO. icon"
          className="size-12 rounded-xl shrink-0"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Instalá PRO. en tu cel</p>
          {isIOS ? (
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Toca <Share className="size-3 inline" /> Compartir &rarr; <strong className="text-zinc-200">Agregar a pantalla de inicio</strong>
            </p>
          ) : (
            <p className="text-xs text-zinc-400 mt-0.5">
              Accedé más rápido, funciona sin barra de browser.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-8 px-3 rounded-xl font-bold"
            >
              <Download className="size-3.5 mr-1" />
              Instalar
            </Button>
          )}
          <button
            onClick={dismiss}
            className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
