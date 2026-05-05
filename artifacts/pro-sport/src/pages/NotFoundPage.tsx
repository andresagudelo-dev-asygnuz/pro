import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="text-center">
        <h1 className="text-8xl font-black text-zinc-200 dark:text-zinc-800 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Página no encontrada</h2>
        <p className="text-muted-foreground mb-6">Esta página no existe o fue eliminada.</p>
        <Link href="/">
          <Button>Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
