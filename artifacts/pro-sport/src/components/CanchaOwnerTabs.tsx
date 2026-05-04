import { Link, useLocation } from "wouter";
import { Calendar, Users, BarChart2, ChevronLeft } from "lucide-react";

interface Props {
  canchaId: string;
  canchaName?: string;
}

export function CanchaOwnerTabs({ canchaId, canchaName }: Props) {
  const [location] = useLocation();

  const tabs = [
    { href: `/canchas/${canchaId}/agenda`,   label: "Agenda",        Icon: Calendar  },
    { href: `/canchas/${canchaId}/clientes`, label: "Clientes",      Icon: Users     },
    { href: `/canchas/${canchaId}/stats`,    label: "Estadísticas",  Icon: BarChart2 },
  ];

  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b border-border/50 sticky top-0 z-20">
      {/* Cancha name + back */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <Link href="/mis-canchas">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="size-4" />
          </button>
        </Link>
        {canchaName && (
          <p className="text-sm font-semibold truncate">{canchaName}</p>
        )}
      </div>
      {/* Tabs */}
      <div className="flex">
        {tabs.map(({ href, label, Icon }) => {
          const active = location.startsWith(href);
          return (
            <Link key={href} href={href} className="flex-1">
              <button
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium border-b-2 transition-all ${
                  active
                    ? "border-violet-600 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">{label}</span>
                <span className="xs:hidden sm:hidden">{label.split(" ")[0]}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
