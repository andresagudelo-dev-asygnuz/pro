import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, ArrowLeft } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <h1 className="text-[12rem] font-black text-primary/50 blur-sm pointer-events-none">404</h1>
          </div>
          <div className="relative z-10 flex flex-col items-center mt-12">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-3">Página no encontrada</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">
              Lo sentimos, no pudimos encontrar la página que estás buscando. Es posible que haya sido movida o eliminada.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 relative z-10">
          <Button 
            variant="outline" 
            className="w-full sm:w-auto h-12 px-6" 
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver atrás
          </Button>
          <Link href="/">
            <Button className="w-full sm:w-auto h-12 px-6">
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
