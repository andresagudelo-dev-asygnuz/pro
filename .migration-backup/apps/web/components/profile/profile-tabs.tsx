import Link from "next/link";

export type ProfileTabId =
  | "identidad"
  | "morfo"
  | "condicional"
  | "tecnico"
  | "preview";

type Tab = {
  id: ProfileTabId;
  label: string;
};

const TABS: Tab[] = [
  { id: "identidad", label: "1 · Identidad" },
  { id: "morfo", label: "2 · Morfológico" },
  { id: "condicional", label: "3 · Capacidades" },
  { id: "tecnico", label: "4 · Destrezas fútbol" },
  { id: "preview", label: "Vista previa" },
];

export function resolveTab(raw: string | string[] | undefined): ProfileTabId {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const ids = TABS.map((t) => t.id);
  return (ids as string[]).includes(v ?? "")
    ? (v as ProfileTabId)
    : "identidad";
}

/**
 * Navegación por bloque del editor de perfil (HU-003 PR C).
 * URL-driven: cada tab es un Link a `/perfil?tab=<id>`. Usamos `replace`
 * para no polucionar el historial del browser al cambiar de bloque.
 */
export function ProfileTabs({ active }: { active: ProfileTabId }) {
  return (
    <nav
      aria-label="Bloques del perfil"
      className="flex flex-wrap items-center gap-1 rounded-xl border bg-background p-1.5"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={`/perfil?tab=${t.id}`}
            replace
            scroll={false}
            aria-current={isActive ? "page" : undefined}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
              (isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
