import { Link, useLocation } from "wouter";
import { Calendar, Users, BarChart2, ChevronLeft, Shield } from "lucide-react";

interface Props {
  canchaId: string;
  canchaName?: string;
}

export function CanchaOwnerTabs({ canchaId, canchaName }: Props) {
  const [location] = useLocation();

  const tabs = [
    { href: `/canchas/${canchaId}/agenda`,   label: "Agenda",  Icon: Calendar  },
    { href: `/canchas/${canchaId}/clientes`, label: "Clientes", Icon: Users    },
    { href: `/canchas/${canchaId}/equipo`,   label: "Equipo",  Icon: Shield    },
    { href: `/canchas/${canchaId}/stats`,    label: "Stats",   Icon: BarChart2 },
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
                className={`w-full flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 px-1 py-2.5 text-[11px] sm:text-xs font-medium border-b-2 transition-all ${
                  active
                    ? "border-violet-600 text-violet-600 dark:text-violet-400"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="size-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
