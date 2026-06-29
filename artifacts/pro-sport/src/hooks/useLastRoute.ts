// useLastRoute — Persists and restores the last visited route across sessions
import { useEffect } from "react";
import { useLocation } from "wouter";

const STORAGE_KEY = "pro:last-route";

// Routes we don't want to restore (auth, onboarding, landing)
const EXCLUDED_PREFIXES = ["/", "/login", "/signup", "/registro", "/onboarding", "/recuperar", "/nueva-contrasena", "/u/"];

function shouldPersist(path: string): boolean {
  if (path === "/" || path === "") return false;
  return !EXCLUDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
}

export function useLastRoute() {
  const [location] = useLocation();

  useEffect(() => {
    if (shouldPersist(location)) {
      localStorage.setItem(STORAGE_KEY, location);
    }
  }, [location]);
}

export function getLastRoute(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
