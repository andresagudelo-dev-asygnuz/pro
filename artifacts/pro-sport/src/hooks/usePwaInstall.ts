import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
let listeners: Array<() => void> = [];

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

// Global listener to capture the prompt once
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState(!!globalDeferredPrompt);

  useEffect(() => {
    const listener = () => setCanInstall(!!globalDeferredPrompt);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  async function install() {
    if (!globalDeferredPrompt) return;
    await globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      notifyListeners();
    }
  }

  return {
    canInstall,
    install,
    isIOS: isIOS(),
    isStandalone: isInStandaloneMode(),
  };
}
