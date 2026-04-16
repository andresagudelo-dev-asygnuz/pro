import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

function getSupabaseStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const configured = Boolean(url && key);
  return { configured, url };
}

export default function Home() {
  const { configured, url } = getSupabaseStatus();

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>PRO — Plataforma deportiva</CardTitle>
          <CardDescription>
            Bootstrap del stack: Next.js + Tailwind + shadcn/ui + Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-muted-foreground">Supabase</span>
            {configured ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Configurado{url ? ` · ${new URL(url).host}` : ""}
              </span>
            ) : (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Faltan variables de entorno
              </span>
            )}
          </div>
          {!configured && (
            <p className="text-muted-foreground">
              Copiá <code className="font-mono">.env.example</code> a{" "}
              <code className="font-mono">.env.local</code> y completá{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
              <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </p>
          )}
        </CardContent>
        <CardFooter className="gap-2">
          <Link
            href="https://supabase.com/docs"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants())}
          >
            Docs Supabase
          </Link>
          <Link
            href="https://ui.shadcn.com"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            shadcn/ui
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
