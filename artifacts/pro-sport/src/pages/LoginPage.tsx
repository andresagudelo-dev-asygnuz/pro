import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-3xl font-black italic tracking-tighter text-zinc-900 dark:text-white uppercase">
            PRO<span className="text-brand-primary">.</span>
          </span>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-white">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresá a tu cuenta</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-border p-8 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
