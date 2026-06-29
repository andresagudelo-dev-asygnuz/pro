import { useEffect, useState } from "react";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

// Configure nprogress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 });

// Global styles for nprogress to match the theme (violet-600)
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    #nprogress .bar {
      background: #7c3aed !important;
      height: 3px !important;
    }
    #nprogress .peg {
      box-shadow: 0 0 10px #7c3aed, 0 0 5px #7c3aed !important;
    }
  `;
  document.head.appendChild(style);
}

export function TopBarProgress() {
  useEffect(() => {
    NProgress.start();
    return () => {
      NProgress.done();
    };
  }, []);

  return null;
}

// Global flag to track initial load
let isInitialLoad = true;

export function PageLoader() {
  const [initial, setInitial] = useState(isInitialLoad);

  useEffect(() => {
    if (!isInitialLoad) return;
    const timer = setTimeout(() => {
      isInitialLoad = false;
      setInitial(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (initial) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-baseline mb-8 animate-pulse drop-shadow-md">
          <span className="text-5xl md:text-6xl font-black italic tracking-tighter text-zinc-900 dark:text-zinc-100">PRO</span>
          <span className="w-3 h-3 md:w-4 md:h-4 bg-violet-600 rounded-full ml-1"></span>
        </div>
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // After initial load, fallback to TopBarProgress for lazy-loaded route transitions
  return <TopBarProgress />;
}
