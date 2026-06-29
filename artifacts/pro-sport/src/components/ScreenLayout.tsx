import { PageHeader } from "@/components/PageHeader";
import { BottomNav } from "@/components/BottomNav";
import { OwnerBottomNav } from "@/components/OwnerBottomNav";
import { useLocation } from "wouter";
import type { ReactNode } from "react";

interface ScreenLayoutProps {
  title: ReactNode;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ScreenLayout({ title, backHref, actions, children, className }: ScreenLayoutProps) {
  const [location] = useLocation();
  const isOwnerContext = location.startsWith("/mis-canchas") || location.startsWith("/canchas/");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 md:pb-0">
      <PageHeader title={title} backHref={backHref} actions={actions} />
      {className ? (
        <div className={className}>{children}</div>
      ) : (
        children
      )}
      <div className="md:hidden">
        {isOwnerContext ? <OwnerBottomNav /> : <BottomNav />}
      </div>
    </div>
  );
}
