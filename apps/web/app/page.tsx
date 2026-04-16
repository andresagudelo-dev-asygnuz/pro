import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/40">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-lg font-semibold tracking-tight">PRO</span>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
        <div className="flex flex-col gap-4">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
            ⚽ 🎾 🏀 Para deportistas amateurs
          </span>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Encontrá con quién jugar. Cuando quieras, donde quieras.
          </h1>
          <p className="mx-auto max-w-xl text-balance text-base text-muted-foreground">
            PRO es la comunidad deportiva para armar partidos abiertos,
            coordinar con gente de tu nivel y construir tu reputación como
            deportista.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Empezar — es gratis
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Ya tengo cuenta
          </Link>
        </div>

        <div className="grid w-full gap-4 sm:grid-cols-3">
          <Card className="text-left">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">Confianza</CardTitle>
              <CardDescription>
                Perfiles con rating y partidos jugados. Sabés con quién jugás.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-left">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">Coordinación</CardTitle>
              <CardDescription>
                Feed de partidos abiertos + chat en vivo por partido.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="text-left">
            <CardHeader className="gap-1">
              <CardTitle className="text-base">Matching por nivel</CardTitle>
              <CardDescription>
                Elegís deporte, ciudad y nivel — jugás con gente parecida a vos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="w-full text-left">
          <CardHeader className="gap-1">
            <CardTitle className="text-base">¿Por qué existe PRO?</CardTitle>
            <CardDescription>
              Estamos validando la hipótesis: los deportistas amateurs no
              entrenan de forma constante por 3 problemas — confianza,
              coordinación e infraestructura. Si este MVP resuelve el suyo,
              seguimos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/signup"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Sumate a validarlo →
            </Link>
          </CardContent>
        </Card>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-xs text-muted-foreground">
        PRO · MVP v0 · en validación
      </footer>
    </div>
  );
}
